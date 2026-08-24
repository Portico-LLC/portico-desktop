import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'portico-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode) — fall back to system.
  }
  return 'system';
}

function applyToDocument(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
  window.portico?.theme?.setNative(resolved);
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  initialized: boolean;
  init: () => void;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // index.html's inline bootstrap script already set the attribute before
  // paint — this initial state just mirrors it so React doesn't cause a
  // second, redundant flip on mount.
  preference: 'system',
  resolved: 'light',
  initialized: false,

  init: () => {
    if (get().initialized) return;
    const preference = readStoredPreference();
    const resolved = resolve(preference);
    set({ preference, resolved, initialized: true });
    applyToDocument(resolved);

    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (get().preference !== 'system') return;
      const next = resolve('system');
      set({ resolved: next });
      applyToDocument(next);
    });

    // Cross-window sync: the main app window and the mini panel are separate
    // BrowserWindows/tabs on the same origin, so a change in one fires a
    // `storage` event in the other (this does not fire in the window that
    // made the change, only other windows/tabs — exactly what's needed here).
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const preference = readStoredPreference();
      const resolved = resolve(preference);
      set({ preference, resolved });
      applyToDocument(resolved);
    });
  },

  setPreference: (preference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Non-fatal — the choice just won't survive a reload this session.
    }
    const resolved = resolve(preference);
    set({ preference, resolved });
    applyToDocument(resolved);
  },
}));
