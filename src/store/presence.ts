import { create } from 'zustand';
import type { PresenceEntry, PresencePeek, TeamMemberType } from '@/lib/types';
import type { PresenceState } from '@/components/ui/PresenceDot';

function key(type: TeamMemberType, id: string): string {
  return `${type}:${id}`;
}

interface PresenceStore {
  entries: Record<string, PresenceEntry | PresencePeek>;
  applySnapshot: (entries: PresenceEntry[]) => void;
  apply: (entry: PresenceEntry | PresencePeek) => void;
  get: (type: TeamMemberType, id: string) => PresenceEntry | PresencePeek | null;
  reset: () => void;
}

/**
 * Live presence for everyone in the studio, fed entirely by socket events.
 *
 * Zustand rather than React Query because this is push-only state with no fetch of its own
 * (the server sends a snapshot on connect), and because a presence change must not
 * invalidate and refetch the message list.
 *
 * Entries can be either the full record (staff) or the reduced peek clients receive, so
 * every read has to tolerate the focus text being absent.
 */
export const usePresenceStore = create<PresenceStore>((set, get) => ({
  entries: {},
  applySnapshot: (entries) =>
    set({ entries: Object.fromEntries(entries.map((e) => [key(e.actorType, e.actorId), e])) }),
  apply: (entry) =>
    set((state) => ({
      entries: {
        ...state.entries,
        // Merge rather than replace: a peek carries fewer fields than the snapshot already
        // held, and overwriting would drop a known status message.
        [key(entry.actorType, entry.actorId)]: {
          ...state.entries[key(entry.actorType, entry.actorId)],
          ...entry,
        },
      },
    })),
  get: (type, id) => get().entries[key(type, id)] ?? null,
  reset: () => set({ entries: {} }),
}));

/** Focus outranks availability: someone heads-down is what you need to know, whether or not
 *  they happen to have a tab open. */
export function presenceStateOf(entry: PresenceEntry | PresencePeek | null | undefined): PresenceState | null {
  if (!entry) return null;
  if (entry.focusMode) return 'focus';
  return entry.status;
}

/** Convenience reader for a single actor. */
export function usePresenceOf(type: TeamMemberType | undefined, id: string | undefined) {
  return usePresenceStore((s) => (type && id ? s.entries[key(type, id)] ?? null : null));
}
