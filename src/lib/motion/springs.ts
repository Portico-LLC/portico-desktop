import type { Transition } from 'framer-motion';

// Named spring presets translating the Apple HIG motion guidance (response +
// damping ratio) into framer-motion's `duration` + `bounce` spring spec —
// `bounce: 0` is exactly "critically damped" (damping ratio 1.0).
export const springs = {
  // Width/position changes (sidebar collapse, snap-back after a drag) — the
  // guidance's "Move/reposition: damping 1.0, response 0.4".
  reposition: { type: 'spring', duration: 0.4, bounce: 0 } as Transition,
  // Dialogs, dropdowns, the panel tab pill — critically damped UI shouldn't
  // bounce per the guidance, just settle quickly.
  snappy: { type: 'spring', duration: 0.28, bounce: 0 } as Transition,
  // The only place bounce belongs: a gesture release that's actually carrying
  // momentum (e.g. a flung toast), never a programmatic UI transition.
  dismissGesture: { type: 'spring', duration: 0.3, bounce: 0.2 } as Transition,
};

// `prefers-reduced-motion` fallback — a short cross-fade instead of a spring.
export const reducedTransition: Transition = { duration: 0.15 };

export function motionTransition(reduce: boolean, spring: Transition): Transition {
  return reduce ? reducedTransition : spring;
}
