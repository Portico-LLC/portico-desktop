import { create } from 'zustand';
import type { PanelPrefs } from '@/types/electron';

export const FALLBACK_PANEL_PREFS: PanelPrefs = {
  opacity: 100,
  blurMode: 'off',
  cornerRadius: 16,
  sizePreset: 'compact',
  customSize: null,
  position: null,
  alwaysOnTop: true,
  shortcut: 'CommandOrControl+Shift+P',
  activeTab: 'tasks',
  notificationsMuted: false,
};

interface PanelPrefsState {
  prefs: PanelPrefs;
  isLoading: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setPref: (patch: Partial<PanelPrefs>) => Promise<void>;
}

export const usePanelPrefsStore = create<PanelPrefsState>((set, get) => ({
  prefs: FALLBACK_PANEL_PREFS,
  isLoading: true,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    set({ hydrated: true });
    if (!window.portico) {
      set({ isLoading: false });
      return;
    }
    try {
      const prefs = await window.portico.prefs.get();
      set({ prefs, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
    window.portico.prefs.onChange((prefs) => set({ prefs }));
  },

  setPref: async (patch) => {
    // Optimistic local update — the main process is the source of truth and
    // will broadcast the merged result back via prefs.onChange.
    set((state) => ({ prefs: { ...state.prefs, ...patch } }));
    if (!window.portico) return;
    try {
      const prefs = await window.portico.prefs.set(patch);
      set({ prefs });
    } catch {
      // Leave the optimistic value in place — a transient IPC failure shouldn't
      // visibly revert a slider the user is dragging.
    }
  },
}));
