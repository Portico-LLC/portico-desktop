import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { useOnboardingStore } from '@/store/onboarding';
import { ONBOARDING_QUERY_KEY, fetchBootstrap, postProgress } from '@/lib/onboarding/api';
import { builtInStepsFor } from '@/lib/onboarding/tourSteps';
import { renderRichText } from '@/lib/onboarding/renderRichText';
import type { OnboardingScope, OnboardingSubjectType, StudioStep } from '@/lib/onboarding/types';
import { SpotlightTour, type RuntimeStep } from './SpotlightTour';
import { StudioStepMedia } from './StudioStepMedia';

// The reel imports eight animated landing-page scenes. Kept out of the main bundle for the same
// reason `App.tsx` splits Documents and Arcade — most sessions never mount it.
const CinematicIntro = lazy(() =>
  import('./CinematicIntro').then((m) => ({ default: m.CinematicIntro })),
);

/**
 * Decides whether anyone should be onboarded right now, and runs the two acts in order.
 *
 * Mounted inside `Layout` and `ClientLayout` rather than at the `App` root. That placement is
 * load-bearing: `/panel` and `/source-picker` are declared outside those shells, so the
 * frameless Electron windows structurally cannot start a tour — no route sniffing needed. It
 * also means the landing page, login and the invite screen are excluded for free.
 */
export function OnboardingProvider() {
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  const phase = useOnboardingStore((s) => s.phase);
  const setPhase = useOnboardingStore((s) => s.setPhase);
  const resetStore = useOnboardingStore((s) => s.reset);
  const replayNonce = useOnboardingStore((s) => s.replayNonce);
  const skipIntro = useOnboardingStore((s) => s.skipIntro);

  const [scope, setScope] = useState<OnboardingScope | null>(null);
  const [startIndex, setStartIndex] = useState(0);

  const { data } = useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: () => fetchBootstrap(role),
    enabled: isAuthenticated,
    // The bootstrap is read once per session in practice; refetching it mid-tour would only
    // risk yanking the script out from under a running walkthrough.
    staleTime: Infinity,
    retry: 1,
  });

  const subjectType: OnboardingSubjectType = data?.subject.type ?? 'owner';

  // --- Deciding whether to run ---------------------------------------------
  useEffect(() => {
    if (!data || phase !== 'idle' || !data.next) return;
    const resuming =
      data.next === 'builtIn'
        ? data.builtIn.status === 'in_progress'
        : data.studio?.status === 'in_progress';
    setScope(data.next);
    // Someone partway through has already seen the reel — dropping them back into it would be
    // a punishment for closing the tab.
    setPhase(data.next === 'builtIn' && !resuming ? 'intro' : 'tour', data.next);
  }, [data, phase, setPhase]);

  // --- Replay, requested from the profile menu or Settings ------------------
  // Keyed on the nonce having actually moved, not merely on the effect running. `data` is in
  // the dependency list, and it changes when a finished tour invalidates the bootstrap — which
  // without this guard would immediately restart the tour that just ended.
  const handledReplayRef = useRef(0);
  useEffect(() => {
    if (replayNonce === 0 || replayNonce === handledReplayRef.current || !data) return;
    handledReplayRef.current = replayNonce;
    setScope('builtIn');
    setStartIndex(0);
    void postProgress(role, { scope: 'builtIn', status: 'not_started', stepId: null });
    setPhase(skipIntro ? 'tour' : 'intro', 'builtIn');
  }, [replayNonce, data, role, setPhase, skipIntro]);

  // --- Step lists ----------------------------------------------------------
  const steps: RuntimeStep[] = useMemo(() => {
    if (!data || !scope) return [];
    if (scope === 'builtIn') {
      return builtInStepsFor(subjectType, data.enabledModules).map((step) => ({
        id: step.id,
        eyebrow: step.eyebrow,
        title: step.title,
        body: step.body,
        anchorId: step.anchorId,
        onAnchorMissing: step.onAnchorMissing ?? 'skip',
      }));
    }
    return (data.studio?.steps ?? []).map((step) => toRuntimeStep(step, role));
  }, [data, scope, subjectType, role]);

  // Resume where they stopped, clamped — the saved id may have been filtered out by a module
  // the studio switched off since.
  useEffect(() => {
    if (!data || !scope || steps.length === 0) return;
    const resumeId = scope === 'builtIn' ? data.builtIn.resumeStepId : data.studio?.resumeStepId;
    const found = resumeId ? steps.findIndex((s) => s.id === resumeId) : -1;
    setStartIndex(found >= 0 ? found : 0);
  }, [data, scope, steps]);

  const report = useCallback(
    (payload: Parameters<typeof postProgress>[1]) => {
      // Fire-and-forget: the UI has already advanced, and a failed write costs one repeated
      // step on resume rather than a stalled tour.
      void postProgress(role, payload).catch(() => undefined);
    },
    [role],
  );

  const handleStepChange = useCallback(
    (step: RuntimeStep) => {
      if (!scope) return;
      report({
        scope,
        status: 'in_progress',
        stepId: step.id,
        ...(scope === 'studio' && data?.studio ? { flowVersion: data.studio.version } : {}),
      });
    },
    [report, scope, data],
  );

  const settle = useCallback(
    async (status: 'completed' | 'skipped') => {
      const finishing = scope;
      resetStore();
      setScope(null);
      if (!finishing) return;

      // Awaited, unlike per-step reporting. The invalidate below refetches `next`, and racing
      // it against this write would read back a stale "still needs onboarding" and immediately
      // restart the tour the user just dismissed.
      try {
        await postProgress(role, { scope: finishing, status });
      } catch {
        // The tour is already closed; a failed write only costs a repeat next session.
      }

      // Handing off from the built-in tour to a studio flow needs the fresh `next` the server
      // computes, so re-read rather than guessing here.
      if (finishing === 'builtIn') {
        await queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
      }
    },
    [scope, role, resetStore, queryClient],
  );

  const handleFinish = useCallback(() => void settle('completed'), [settle]);
  const handleSkip = useCallback(() => void settle('skipped'), [settle]);
  const handleIntroDone = useCallback(() => setPhase('tour'), [setPhase]);

  if (!isAuthenticated || phase === 'idle' || steps.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        {phase === 'intro' && (
          <Suspense fallback={null}>
            <CinematicIntro
              role={subjectType}
              onFinish={handleIntroDone}
              onSkip={handleIntroDone}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {phase === 'tour' && (
        <SpotlightTour
          steps={steps}
          startIndex={startIndex}
          onStepChange={handleStepChange}
          onFinish={handleFinish}
          onSkip={handleSkip}
        />
      )}
    </>
  );
}

function toRuntimeStep(step: StudioStep, role: ReturnType<typeof useAuthStore.getState>['role']): RuntimeStep {
  return {
    id: step.id,
    eyebrow: step.isTask ? 'To do' : 'Onboarding',
    title: step.title,
    body: renderRichText(step.body, step.id),
    anchorId: step.anchorId ?? undefined,
    // Owner-authored steps are content-first — their words stand on their own, so a missing
    // anchor demotes the step to a plain card instead of discarding what they wrote.
    onAnchorMissing: step.onAnchorMissing ?? 'modal',
    media: step.mediaDocumentId ? <StudioStepMedia stepId={step.id} role={role} /> : undefined,
  };
}
