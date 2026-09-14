export interface PanelPrefs {
  opacity: number;
  blurMode: 'off' | 'frosted' | 'heavy';
  cornerRadius: number;
  sizePreset: 'compact' | 'standard' | 'tall' | 'custom';
  customSize: { width: number; height: number } | null;
  position: { x: number; y: number } | null;
  alwaysOnTop: boolean;
  shortcut: string;
  activeTab: 'tasks' | 'calendar' | 'messages' | 'projects' | 'vault' | 'preferences' | 'record' | 'calls' | 'radar' | 'steward';
  notificationsMuted: boolean;
  meetingDetection: boolean;
}

/** A meeting the desktop detector believes is currently in progress. `key`
 *  identifies this specific meeting so dismissing it doesn't silence the next one. */
export interface MeetingDetection {
  app: 'zoom' | 'microsoft_teams' | 'google_meet' | 'slack';
  label: string;
  key: string;
}

export interface MeetingDetectionState {
  enabled: boolean;
  /** Window-title detection is Windows-only; macOS would need Accessibility consent. */
  supported: boolean;
  current: string | null;
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

/** Whether the bundled google-maps-scraper binary can run on this machine. */
export interface LeadsScraperAvailability {
  available: boolean;
  reason: 'unsupported-platform' | 'binary-missing' | null;
}

export interface LeadsScraperReadyResult {
  ok: boolean;
  baseUrl?: string;
  reason?: 'unsupported-platform' | 'binary-missing' | 'install-failed' | 'start-timeout';
  message?: string;
}

export interface LeadsInstallProgress {
  phase: 'installing' | 'starting' | 'ready';
  chunk?: string;
}

/** Result of geocoding a place name via OpenStreetMap Nominatim — decimal
 *  degrees as strings, matching the shape the scraper's JobData expects. */
export interface LeadsGeocodeResult {
  lat: string;
  lon: string;
}

/** Mirrors gosom/google-maps-scraper's `JobData` request/response shape (its
 *  `-web` REST API — see web/job.go upstream). */
export interface LeadsJobData {
  keywords: string[];
  lang: string;
  zoom: number;
  lat: string;
  lon: string;
  fast_mode: boolean;
  radius: number;
  depth: number;
  email: boolean;
  extra_reviews: boolean;
  max_time: number; // seconds, scraper recommends >= 180
  proxies: string[];
}

export interface LeadsJob {
  ID: string;
  Name: string;
  Date: string;
  Status: 'pending' | 'working' | 'ok' | 'failed';
  Data: LeadsJobData;
}

/** POST /api/v1/jobs body — Go's `apiScrapeRequest{ Name string; JobData }` is
 *  an embedded struct, so `name` is flattened alongside the JobData fields at
 *  the top level of the JSON body, not nested. `name` is required — the scraper
 *  rejects a request with no name as 422 "missing name". */
export interface LeadsCreateJobPayload extends LeadsJobData {
  name: string;
}

/** One row parsed from the scraper's downloaded CSV — column names are the raw
 *  CSV headers (see the scraper's "Extracted Data Points" docs upstream). */
export type LeadsScrapedRow = Record<string, string>;

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
  calls: {
    getDetectionState: () => Promise<MeetingDetectionState>;
    setDetectionEnabled: (enabled: boolean) => Promise<MeetingDetectionState>;
    /** Suppresses this specific meeting for 30 minutes. */
    dismissDetection: (key: string) => void;
    /** Pauses detection while a call is already being recorded. */
    setCallActive: (active: boolean) => void;
    onMeetingDetected: (cb: (detection: MeetingDetection) => void) => () => void;
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
  leads: {
    getStatus: () => Promise<LeadsScraperAvailability>;
    ensureReady: () => Promise<LeadsScraperReadyResult>;
    geocode: (query: string) => Promise<LeadsGeocodeResult | null>;
    createJob: (jobData: LeadsCreateJobPayload) => Promise<{ id: string }>;
    listJobs: () => Promise<LeadsJob[]>;
    getJob: (id: string) => Promise<LeadsJob>;
    deleteJob: (id: string) => Promise<boolean>;
    downloadJob: (id: string) => Promise<LeadsScrapedRow[]>;
    onInstallProgress: (cb: (progress: LeadsInstallProgress) => void) => () => void;
  };
}

declare global {
  interface Window {
    __ELECTRON__?: { isElectron: true };
    portico?: PorticoBridge;
  }
}
