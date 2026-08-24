const {
  app,
  BrowserWindow,
  shell,
  Menu,
  Tray,
  protocol,
  net,
  globalShortcut,
  screen,
  ipcMain,
  nativeImage,
  session,
  desktopCapturer,
  systemPreferences,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;

// Serve the packaged build over a registered "app://" scheme instead of raw
// file://. Chromium treats file:// documents as opaque origins, which breaks
// two things this app relies on: the built entry script's `crossorigin`
// module fetch (fails CORS — file:// can never return an Access-Control
// header) and react-router's history.pushState (throws SecurityError when a
// file:// document rewrites its own path). A privileged custom scheme behaves
// like a normal origin, so both just work.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

let mainWindow;
let panelWindow;
let tray;

app.isQuitting = false;

function registerAppProtocol() {
  const distRoot = path.join(__dirname, '..', 'dist');
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname).replace(/^\/+/, '');
    const filePath = path.join(distRoot, relative);
    const response = await net.fetch(pathToFileURL(filePath).toString()).catch(() => null);
    if (response && response.ok) return response;
    // SPA fallback for any path that isn't a real built asset.
    return net.fetch(pathToFileURL(path.join(distRoot, 'index.html')).toString());
  });
}

function createWindow() {
  // Scales with the actual display instead of a fixed size, so "big" still
  // fits on a smaller laptop screen — same technique the panel window uses.
  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.min(1600, workArea.width - 80);
  const height = Math.min(1000, workArea.height - 80);

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 960,
    minHeight: 640,
    icon: path.join(__dirname, '..', 'build', 'icons', 'png', '256x256.png'),
    title: 'Portico',
    // Windows/Linux get a fully custom title bar (MainTitleBar.tsx) with our
    // own minimize/maximize/close buttons — frame:false removes the native
    // one entirely. macOS keeps its native inset traffic lights, since
    // replacing those isn't part of this pass and users expect them there.
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : { frame: false }),
    backgroundColor: '#FCFBF8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL('app://portico/index.html');
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // The Google sign-in popup needs to open as a real in-app window (not the OS
    // browser) so it can postMessage the auth result back to window.opener.
    try {
      const parsed = new URL(url);
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.pathname.startsWith('/auth/google')) {
        return { action: 'allow' };
      }
    } catch {
      // fall through to external handling below
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Custom title bar's maximize/restore icon needs to track state changes
  // that don't come from its own button too (double-click, Win+Up, Aero snap).
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false));

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Closing the main window quits the app (existing behavior). A hidden panel
    // window staying alive must not change that — Portico isn't a tray-resident
    // background app.
    if (process.platform !== 'darwin') {
      app.isQuitting = true;
      app.quit();
    }
  });
}

// ── Panel window: preferences ────────────────────────────────────────────────

const PREFS_PATH = path.join(app.getPath('userData'), 'panel-preferences.json');

const DEFAULT_PANEL_PREFS = {
  opacity: 100,
  blurMode: 'off', // 'off' | 'frosted' | 'heavy'
  cornerRadius: 16,
  sizePreset: 'compact', // 'compact' | 'standard' | 'tall' | 'custom'
  customSize: null,
  position: null, // { x, y } — null until first placed/moved
  alwaysOnTop: true,
  shortcut: 'CommandOrControl+Shift+P',
  activeTab: 'tasks',
  notificationsMuted: false,
};

const SIZE_PRESETS = {
  compact: { width: 360, height: 520 },
  standard: { width: 360, height: 640 },
  tall: { width: 360, height: 760 },
};

let panelPrefs = { ...DEFAULT_PANEL_PREFS };

function loadPanelPrefs() {
  try {
    const raw = fs.readFileSync(PREFS_PATH, 'utf8');
    return { ...DEFAULT_PANEL_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PANEL_PREFS };
  }
}

let savePrefsTimer = null;
function savePanelPrefs(patch) {
  panelPrefs = { ...panelPrefs, ...patch };
  if (savePrefsTimer) clearTimeout(savePrefsTimer);
  savePrefsTimer = setTimeout(() => {
    try {
      fs.writeFileSync(PREFS_PATH, JSON.stringify(panelPrefs, null, 2));
    } catch {
      /* non-critical */
    }
  }, 300);
  return panelPrefs;
}

function resolvePanelSize(prefs) {
  return prefs.sizePreset === 'custom' && prefs.customSize
    ? prefs.customSize
    : SIZE_PRESETS[prefs.sizePreset] || SIZE_PRESETS.compact;
}

// A saved position can go stale — the monitor it was on gets unplugged, a laptop
// switches to a smaller display, etc. — leaving the panel permanently, invisibly
// off-screen (looks exactly like "the panel isn't opening" to the user). Only trust
// it if a real chunk of the window would land within some currently connected display.
function isPositionReachable(x, y, width, height) {
  const margin = 24;
  return screen.getAllDisplays().some(({ workArea: w }) => (
    x + width > w.x + margin && x < w.x + w.width - margin &&
    y + height > w.y + margin && y < w.y + w.height - margin
  ));
}

function getPanelBounds(prefs) {
  const { width, height } = resolvePanelSize(prefs);
  if (prefs.position && isPositionReachable(prefs.position.x, prefs.position.y, width, height)) {
    return { width, height, x: prefs.position.x, y: prefs.position.y };
  }
  const { workArea } = screen.getPrimaryDisplay();
  const margin = 24;
  return {
    width,
    height,
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + workArea.height - height - margin,
  };
}

function nativeBlurActive(blurMode) {
  return !!blurMode && blurMode !== 'off';
}

// Native "blur" is a discrete OS material, not a continuous radius — macOS
// vibrancy and Windows 11 backgroundMaterial only offer a handful of presets.
// Anything unsupported (Windows 10, Linux, or an incompatible combination with
// transparent:true) silently gets no native effect; the CSS opacity layer in
// the renderer is the fallback that always works.
function getBlurWindowOptions(blurMode) {
  if (!blurMode || blurMode === 'off') return {};
  if (process.platform === 'darwin') {
    return { vibrancy: blurMode === 'heavy' ? 'hud' : 'sidebar', visualEffectState: 'active' };
  }
  if (process.platform === 'win32') {
    return { backgroundMaterial: blurMode === 'heavy' ? 'mica' : 'acrylic' };
  }
  return {};
}

function applyPrefsToWindow(patch, previousBlurMode) {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  if ('alwaysOnTop' in patch) {
    panelWindow.setAlwaysOnTop(patch.alwaysOnTop, process.platform === 'darwin' ? 'floating' : undefined);
  }
  if ('sizePreset' in patch || 'customSize' in patch) {
    const size = resolvePanelSize(panelPrefs);
    panelWindow.setSize(size.width, size.height);
  }
  if ('blurMode' in patch) {
    if (nativeBlurActive(previousBlurMode) !== nativeBlurActive(patch.blurMode)) {
      // roundedCorners can only be set when a BrowserWindow is constructed —
      // crossing the off/non-off boundary means the window has to be rebuilt
      // to pick up the new value, otherwise native blur paints square corners.
      recreatePanelWindow();
      return;
    }
    try {
      const opts = getBlurWindowOptions(patch.blurMode);
      if (process.platform === 'darwin' && typeof panelWindow.setVibrancy === 'function') {
        panelWindow.setVibrancy(opts.vibrancy || null);
      } else if (process.platform === 'win32' && typeof panelWindow.setBackgroundMaterial === 'function') {
        panelWindow.setBackgroundMaterial(opts.backgroundMaterial || 'none');
      }
    } catch {
      // Unsupported on this OS/Electron build — the renderer's CSS blur/tint already covers it.
    }
  }
}

function broadcastPrefsChanged() {
  [mainWindow, panelWindow].forEach((w) => {
    if (w && !w.isDestroyed()) w.webContents.send('prefs:changed', panelPrefs);
  });
}

function createPanelWindow() {
  const bounds = getPanelBounds(panelPrefs);

  panelWindow = new BrowserWindow({
    ...bounds,
    minWidth: 320,
    minHeight: 420,
    maxWidth: 480,
    maxHeight: 800,
    frame: false,
    transparent: true,
    // Native blur materials (backgroundMaterial/vibrancy, below) are painted by
    // the OS compositor directly onto the window surface, bypassing Chromium's
    // CSS clip entirely — corners only stay rounded under blur if the OS's own
    // (fixed-radius) window rounding is enabled. Pure CSS rounding (this off)
    // is only correct when no native blur is active.
    roundedCorners: nativeBlurActive(panelPrefs.blurMode),
    // The OS drop shadow wraps the window's actual rectangular bounds, not the
    // CSS-rounded card drawn inside it — with a 24px radius that leaves a faint
    // square halo poking out past every corner. The renderer already draws its
    // own `shadow-lg` that correctly follows the rounded shape, so skip this one.
    hasShadow: false,
    // Frameless Windows BrowserWindows default this to true, which keeps DWM's
    // native resize-border/Aero-snap machinery active — a separate faint
    // rectangular halo around the window that neither hasShadow nor
    // roundedCorners above address, since it's not a drop shadow or corner
    // rounding but the invisible resize hit-test frame itself.
    thickFrame: false,
    resizable: true,
    movable: true,
    alwaysOnTop: panelPrefs.alwaysOnTop,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    title: 'Portico Panel',
    icon: path.join(__dirname, '..', 'build', 'icons', 'png', '256x256.png'),
    ...getBlurWindowOptions(panelPrefs.blurMode),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.platform === 'darwin') {
    panelWindow.setAlwaysOnTop(panelPrefs.alwaysOnTop, 'floating');
  }
  panelWindow.setMenuBarVisibility(false);

  const panelUrl = isDev ? 'http://localhost:5173/#/panel' : 'app://portico/index.html#/panel';
  panelWindow.loadURL(panelUrl);

  // Unlike mainWindow, the panel never initiates an OAuth popup itself — any link it
  // opens (e.g. a "Join with Google Meet" / "Open in Google Calendar" link) should
  // just go to the OS browser instead of Electron's default silent deny.
  panelWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  panelWindow.on('moved', () => {
    if (!panelWindow) return;
    const b = panelWindow.getBounds();
    savePanelPrefs({ position: { x: b.x, y: b.y } });
  });
  panelWindow.on('resized', () => {
    if (!panelWindow) return;
    const b = panelWindow.getBounds();
    savePanelPrefs({ sizePreset: 'custom', customSize: { width: b.width, height: b.height } });
  });

  // No OS chrome on this window (frame:false) — the only way to "close" it is our
  // own header button, which calls hidePanel() over IPC. Guard direct close
  // attempts (Alt+F4, etc.) the same way: hide, don't destroy, so the Team Chat
  // socket connection isn't torn down and reconnected on every toggle.
  panelWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      panelWindow.hide();
    }
  });
  panelWindow.on('closed', () => {
    panelWindow = null;
  });

  return panelWindow;
}

// Rebuilds the panel window in place (same bounds/visibility) so a construction-only
// option — currently roundedCorners — can pick up a new value. Strips all listeners
// from the outgoing window first so its 'closed' handler can't race the new instance
// and null out `panelWindow` right after createPanelWindow() just set it.
function recreatePanelWindow() {
  const outgoing = panelWindow;
  let bounds = null;
  let wasVisible = false;
  let wasFocused = false;
  if (outgoing && !outgoing.isDestroyed()) {
    bounds = outgoing.getBounds();
    wasVisible = outgoing.isVisible();
    wasFocused = outgoing.isFocused();
    outgoing.removeAllListeners();
    outgoing.destroy();
  }

  createPanelWindow();
  if (bounds) panelWindow.setBounds(bounds);
  if (wasVisible) {
    panelWindow.show();
    if (wasFocused) panelWindow.focus();
  }
}

function showPanel() {
  if (!panelWindow || panelWindow.isDestroyed()) createPanelWindow();
  panelWindow.show();
  panelWindow.focus();
}

function hidePanel() {
  panelWindow?.hide();
}

function togglePanel() {
  if (!panelWindow || panelWindow.isDestroyed() || !panelWindow.isVisible()) {
    showPanel();
  } else {
    hidePanel();
  }
}

// ── Screen/window capture (video recorder) ──────────────────────────────────────
//
// Electron has no built-in cross-platform "choose what to share" UI the way a
// browser does — only macOS 14+ offers a native system picker. Everywhere else
// we show our own small picker window (a normal route in the SPA, see
// src/pages/SourcePicker.tsx) backed by desktopCapturer, and resolve Chromium's
// getDisplayMedia() call with whatever the user clicked.

function createSourcePickerWindow() {
  return new Promise((resolve) => {
    const picker = new BrowserWindow({
      width: 640,
      height: 480,
      parent: mainWindow || undefined,
      modal: !!mainWindow,
      frame: false,
      resizable: false,
      alwaysOnTop: true,
      backgroundColor: '#FCFBF8',
      title: 'Choose what to share',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });
    picker.setMenuBarVisibility(false);
    const url = isDev ? 'http://localhost:5173/#/source-picker' : 'app://portico/index.html#/source-picker';
    picker.loadURL(url);

    let settled = false;
    const finish = (sourceId) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('recorder:choose-source', onChoose);
      ipcMain.removeListener('recorder:cancel-source', onCancel);
      if (!picker.isDestroyed()) picker.close();
      resolve(sourceId);
    };
    const onChoose = (_e, sourceId) => finish(sourceId);
    const onCancel = () => finish(null);
    ipcMain.on('recorder:choose-source', onChoose);
    ipcMain.on('recorder:cancel-source', onCancel);
    picker.on('closed', () => finish(null));
  });
}

// On macOS 14+, `useSystemPicker` lets Chromium show the OS's own picker instead
// of ours; the handler still runs (we just hand back the audio preference) so it
// works uniformly across platforms and older macOS versions alike.
function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(
    async (request, callback) => {
      try {
        const sourceId = await createSourcePickerWindow();
        if (!sourceId) {
          callback({});
          return;
        }
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        const source = sources.find((s) => s.id === sourceId);
        if (!source) {
          callback({});
          return;
        }
        callback({ video: source, audio: request.audioRequested ? 'loopback' : undefined });
      } catch {
        callback({});
      }
    },
    { useSystemPicker: process.platform === 'darwin' },
  );
}

// Electron blocks camera/mic access outright unless a permission request
// handler explicitly allows the 'media' permission — the renderer-side
// getUserMedia() prompt users see in a browser has no Electron equivalent.
function setupMediaPermissionHandler() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray() {
  const trayIconPath =
    process.platform === 'win32'
      ? path.join(__dirname, '..', 'build', 'icons', 'win', 'icon.ico')
      : path.join(__dirname, '..', 'build', 'icons', 'png', '32x32.png');

  let trayIcon = nativeImage.createFromPath(trayIconPath);
  if (process.platform !== 'win32') {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
    if (process.platform === 'darwin') trayIcon.setTemplateImage(true);
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Portico');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide Panel',
      click: () => togglePanel(),
    },
    {
      label: 'Preferences',
      click: () => {
        showPanel();
        panelWindow?.webContents.send('panel:set-tab', 'preferences');
      },
    },
    { type: 'separator' },
    {
      label: 'Open Portico',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => togglePanel());
}

// ── Global shortcut ───────────────────────────────────────────────────────────

function tryRegisterShortcut(accelerator) {
  try {
    return globalShortcut.register(accelerator, togglePanel);
  } catch {
    return false;
  }
}

// ── IPC ───────────────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  ipcMain.on('panel:toggle', () => togglePanel());
  ipcMain.on('panel:show', () => showPanel());
  ipcMain.on('panel:hide', () => hidePanel());
  ipcMain.handle('panel:is-open', () => !!panelWindow && !panelWindow.isDestroyed() && panelWindow.isVisible());
  ipcMain.on('panel:show-tab', (_e, tab) => {
    showPanel();
    panelWindow?.webContents.send('panel:set-tab', tab);
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize-toggle', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => !!mainWindow?.isMaximized());

  ipcMain.handle('recorder:get-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    });
    return sources.map((s) => ({ id: s.id, name: s.name, thumbnailDataUrl: s.thumbnail.toDataURL() }));
  });
  // 'recorder:choose-source' / 'recorder:cancel-source' are listened to per-invocation
  // inside createSourcePickerWindow(), not registered globally here.
  ipcMain.handle('recorder:request-media-access', (_e, kind) => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.askForMediaAccess(kind);
  });
  ipcMain.handle('recorder:get-media-access-status', (_e, kind) => {
    if (process.platform !== 'darwin') return 'granted';
    return systemPreferences.getMediaAccessStatus(kind);
  });
  // The recording engine only ever runs in the panel window on desktop (see
  // RecorderController's deepLinkToPanelOnElectron) — excluding that window from
  // screen capture is what keeps its own controls out of an "Entire Screen"
  // recording, on Windows 10 2004+ and macOS.
  ipcMain.on('recorder:set-content-protection', (_e, enabled) => {
    panelWindow?.setContentProtection(!!enabled);
  });

  ipcMain.handle('prefs:get', () => panelPrefs);
  ipcMain.handle('prefs:set', (_e, patch) => {
    const previousBlurMode = panelPrefs.blurMode;
    savePanelPrefs(patch);
    applyPrefsToWindow(patch, previousBlurMode);
    broadcastPrefsChanged();
    return panelPrefs;
  });

  ipcMain.handle('shortcut:get', () => panelPrefs.shortcut);
  ipcMain.handle('shortcut:rebind', (_e, accelerator) => {
    const previous = panelPrefs.shortcut;
    if (previous) {
      try {
        globalShortcut.unregister(previous);
      } catch {
        /* ignore */
      }
    }
    const ok = tryRegisterShortcut(accelerator);
    if (ok) {
      savePanelPrefs({ shortcut: accelerator });
      broadcastPrefsChanged();
      return { ok: true, shortcut: accelerator };
    }
    // Conflict — revert to the previous binding so the app never ends up with none.
    tryRegisterShortcut(previous);
    return { ok: false, error: 'That shortcut is already in use.', shortcut: previous };
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Kill the default File/Edit/View/Window menu bar on Windows/Linux. macOS
  // keeps a minimal native menu since Cmd+C/V/Q etc. are wired through the
  // Edit/App menu roles and stop working without one.
  Menu.setApplicationMenu(
    process.platform === 'darwin'
      ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
      : null
  );

  if (!isDev) registerAppProtocol();
  createWindow();
  setupDisplayMediaHandler();
  setupMediaPermissionHandler();

  panelPrefs = loadPanelPrefs();
  registerIpcHandlers();
  if (!tryRegisterShortcut(panelPrefs.shortcut)) {
    panelPrefs.shortcut = DEFAULT_PANEL_PREFS.shortcut;
    tryRegisterShortcut(panelPrefs.shortcut);
  }
  createTray();
});

app.on('window-all-closed', () => {
  // Safety net: mainWindow's own 'closed' handler is the primary quit trigger
  // (see createWindow) since a hidden-but-alive panelWindow otherwise prevents
  // this event from ever firing on its own.
  if (process.platform !== 'darwin') {
    const remaining = BrowserWindow.getAllWindows().filter((w) => w !== panelWindow);
    if (remaining.length === 0) app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
