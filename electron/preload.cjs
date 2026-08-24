const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__ELECTRON__', {
  isElectron: true,
});

contextBridge.exposeInMainWorld('portico', {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximizeToggle: () => ipcRenderer.send('window:maximize-toggle'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (cb) => {
      const handler = (_e, isMaximized) => cb(isMaximized);
      ipcRenderer.on('window:maximized-changed', handler);
      return () => ipcRenderer.off('window:maximized-changed', handler);
    },
  },
  panel: {
    toggle: () => ipcRenderer.send('panel:toggle'),
    show: () => ipcRenderer.send('panel:show'),
    hide: () => ipcRenderer.send('panel:hide'),
    isOpen: () => ipcRenderer.invoke('panel:is-open'),
    showTab: (tab) => ipcRenderer.send('panel:show-tab', tab),
    onSetTab: (cb) => {
      const handler = (_e, tab) => cb(tab);
      ipcRenderer.on('panel:set-tab', handler);
      return () => ipcRenderer.off('panel:set-tab', handler);
    },
  },
  prefs: {
    get: () => ipcRenderer.invoke('prefs:get'),
    set: (patch) => ipcRenderer.invoke('prefs:set', patch),
    onChange: (cb) => {
      const handler = (_e, prefs) => cb(prefs);
      ipcRenderer.on('prefs:changed', handler);
      return () => ipcRenderer.off('prefs:changed', handler);
    },
  },
  shortcut: {
    get: () => ipcRenderer.invoke('shortcut:get'),
    rebind: (accelerator) => ipcRenderer.invoke('shortcut:rebind', accelerator),
  },
  theme: {
    setNative: (resolved) => ipcRenderer.send('theme:set-native', resolved),
  },
  recorder: {
    getSources: () => ipcRenderer.invoke('recorder:get-sources'),
    chooseSource: (sourceId) => ipcRenderer.send('recorder:choose-source', sourceId),
    cancelSource: () => ipcRenderer.send('recorder:cancel-source'),
    requestMediaAccess: (kind) => ipcRenderer.invoke('recorder:request-media-access', kind),
    getMediaAccessStatus: (kind) => ipcRenderer.invoke('recorder:get-media-access-status', kind),
    setContentProtection: (enabled) => ipcRenderer.send('recorder:set-content-protection', enabled),
  },
});
