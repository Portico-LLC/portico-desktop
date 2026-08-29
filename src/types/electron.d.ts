export interface PanelPrefs {
  opacity: number;
  blurMode: 'off' | 'frosted' | 'heavy';
  cornerRadius: number;
  sizePreset: 'compact' | 'standard' | 'tall' | 'custom';
  customSize: { width: number; height: number } | null;
  position: { x: number; y: number } | null;
  alwaysOnTop: boolean;
  shortcut: string;
  activeTab: 'tasks' | 'calendar' | 'messages' | 'projects' | 'vault' | 'preferences' | 'record' | 'calls' | 'radar';
  notificationsMuted: boolean;
}

export interface ShortcutRebindResult {
  ok: boolean;
  shortcut: string;
  error?: string;
}

export interface DesktopCaptureSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

export type MediaAccessKind = 'microphone' | 'camera';
export type MediaAccessStatus = 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';

export interface PorticoBridge {
  platform: 'darwin' | 'win32' | 'linux' | string;
  window: {
    minimize: () => void;
    maximizeToggle: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizedChange: (cb: (isMaximized: boolean) => void) => () => void;
  };
  panel: {
    toggle: () => void;
    show: () => void;
    hide: () => void;
    isOpen: () => Promise<boolean>;
    showTab: (tab: PanelPrefs['activeTab']) => void;
    onSetTab: (cb: (tab: PanelPrefs['activeTab']) => void) => () => void;
  };
  prefs: {
    get: () => Promise<PanelPrefs>;
    set: (patch: Partial<PanelPrefs>) => Promise<PanelPrefs>;
    onChange: (cb: (prefs: PanelPrefs) => void) => () => void;
  };
  shortcut: {
    get: () => Promise<string>;
    rebind: (accelerator: string) => Promise<ShortcutRebindResult>;
  };
  theme: {
    // One-way: lets the main process match native chrome (context menus,
    // file dialogs) to the renderer's resolved theme. The renderer stores its
    // own preference itself; this is not a round trip.
    setNative: (resolved: 'light' | 'dark') => void;
  };
  recorder: {
    // Only used inside the dedicated /source-picker window (see electron/main.cjs).
    getSources: () => Promise<DesktopCaptureSource[]>;
    chooseSource: (sourceId: string) => void;
    cancelSource: () => void;
    requestMediaAccess: (kind: MediaAccessKind) => Promise<boolean>;
    getMediaAccessStatus: (kind: MediaAccessKind) => Promise<MediaAccessStatus>;
    setContentProtection: (enabled: boolean) => void;
  };
}

declare global {
  interface Window {
    __ELECTRON__?: { isElectron: true };
    portico?: PorticoBridge;
  }
}
