import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { getAnchor } from '@/lib/onboarding/anchors';
import { auditAnchorsInDev, resolveAnchor } from '@/lib/onboarding/resolveAnchor';
import type { AnchorMissingBehaviour } from '@/lib/onboarding/types';
import { CoachMark, type Placement } from './CoachMark';
import { SpotlightOverlay } from './SpotlightOverlay';
import { useAnchorRect } from './useAnchorRect';

/** Built-in and owner-authored steps are normalized to this before they reach the runtime, so
 *  the tour engine has exactly one shape to render. */
export interface RuntimeStep {
  id: string;
  eyebrow: string;
  title: string;
  body: ReactNode;
  anchorId?: string;
  onAnchorMissing: AnchorMissingBehaviour;
  media?: ReactNode;
  footer?: ReactNode;
}

/** Reads the Electron title-bar height off the CSS variable that already drives every
 *  full-height layout — `0px` on web, `36px` in the desktop shell. Without this the overlay
 *  would paint over the custom title bar and kill the window drag region. */
function useTitleBarOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--app-titlebar-height');
    setOffset(Number.parseFloat(raw) || 0);
  }, []);
  return offset;
}

export function SpotlightTour({
  steps,
  startIndex = 0,
  onStepChange,
  onFinish,
  onSkip,
}: {
  steps: RuntimeStep[];
  startIndex?: number;
  onStepChange: (step: RuntimeStep, index: number) => void;
  onFinish: () => void;
  onSkip: (step: RuntimeStep | undefined) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = !!useReducedMotion();
  const titleBarOffset = useTitleBarOffset();

  const [index, setIndex] = useState(startIndex);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [resolving, setResolving] = useState(true);

  const rect = useAnchorRect(element);
  const step = steps[index];

  // `resolveAnchor` spans several renders, so it reads the pathname through a ref rather than a
  // captured value — otherwise it would compare against wherever we were when it started.
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    auditAnchorsInDev();
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (next >= steps.length) onFinish();
      else setIndex(Math.max(0, next));
    },
    [steps.length, onFinish],
  );

  // Held in a ref purely so the anchor-resolution effect below does not have to depend on it.
  // Anchor resolution navigates and awaits the DOM; re-running it because a callback changed
  // identity would restart that work on every render.
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // Resolve the current step's anchor. Every run gets its own AbortController so that clicking
  // Next mid-resolution abandons the old wait instead of racing it.
  useEffect(() => {
    if (!step) return;
    const controller = new AbortController();
    let cancelled = false;

    setResolving(true);
    setElement(null);

    (async () => {
      if (!step.anchorId) {
        if (!cancelled) setResolving(false);
        return;
      }
      const found = await resolveAnchor(step.anchorId, {
        navigate,
        getPathname: () => pathnameRef.current,
        reduce,
        signal: controller.signal,
      });
      if (cancelled) return;
      setElement(found);
      setResolving(false);

      // A pointing-first step with nothing to point at has no content of its own worth
      // reading, so it steps aside rather than showing an orphan card.
      if (!found && step.onAnchorMissing === 'skip') {
        goToRef.current(index + 1);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [step, index, navigate, reduce]);

  useEffect(() => {
    if (step) onStepChange(step, index);
  }, [step, index, onStepChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Never hijack typing — the tour sits on top of a live app with real inputs in it.
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onSkip(step);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index, onSkip, step]);

  if (!step) return null;

  const placement = (step.anchorId ? getAnchor(step.anchorId)?.placement : undefined) as
    | Placement
    | undefined;

  return (
    <>
      <SpotlightOverlay rect={rect} titleBarOffset={titleBarOffset} />
      <AnimatePresence mode="wait">
        {!resolving && (
          <CoachMark
            key={step.id}
            eyebrow={step.eyebrow}
            title={step.title}
            body={step.body}
            media={step.media}
            footer={step.footer}
            stepNumber={index + 1}
            stepCount={steps.length}
            rect={rect}
            preferredPlacement={placement ?? 'right'}
            titleBarOffset={titleBarOffset}
            isFirst={index === 0}
            nextLabel={index === steps.length - 1 ? 'Finish' : undefined}
            onNext={() => goTo(index + 1)}
            onBack={() => goTo(index - 1)}
            onSkip={() => onSkip(step)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
