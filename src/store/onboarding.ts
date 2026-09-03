import { create } from 'zustand';
import type { OnboardingScope } from '@/lib/onboarding/types';

/** Which act is on screen. `intro` is the full-screen cinematic; `tour` is the spotlight over
 *  live UI. They run back to back — `intro` hands off to `tour` — but only one is ever up. */
export type OnboardingPhase = 'idle' | 'intro' | 'tour';

interface OnboardingState {
  phase: OnboardingPhase;
  scope: OnboardingScope | null;
  /** Bumped by `requestReplay`. `OnboardingProvider` watches it so a menu item anywhere in the
   *  app can restart the walkthrough without either side importing the other — the same trick
   *  the command palette uses to be openable from the sidebar. */
  replayNonce: number;
  /** Set when the run should skip the cinematic and go straight to the live tour. */
  skipIntro: boolean;

  setPhase: (phase: OnboardingPhase, scope?: OnboardingScope | null) => void;
  requestReplay: (options?: { skipIntro?: boolean }) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  phase: 'idle',
  scope: null,
  replayNonce: 0,
  skipIntro: false,

  setPhase: (phase, scope) => set({ phase, ...(scope !== undefined ? { scope } : {}) }),

  requestReplay: (options) =>
    set({ replayNonce: get().replayNonce + 1, skipIntro: !!options?.skipIntro }),

  reset: () => set({ phase: 'idle', scope: null, skipIntro: false }),
}));
