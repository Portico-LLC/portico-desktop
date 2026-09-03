import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { motionTransition, springs } from '@/lib/motion/springs';
import type { AnchorRect } from './useAnchorRect';

const CARD_WIDTH = 340;
/** Distance from the spotlight edge to the card, and the minimum breathing space against the
 *  viewport edge. Both on the 8pt rhythm from DESIGN.md §5.1. */
const GAP = 16;
const GUTTER = 16;

export type Placement = 'top' | 'right' | 'bottom' | 'left';

interface Position {
  top: number;
  left: number;
  placement: Placement | 'center';
}

/**
 * Picks a side that actually fits.
 *
 * Preference order starts with whatever the anchor declared, then tries the opposite side, then
 * the perpendicular pair — so a sidebar item asking for `right` still gets a sensible home on a
 * narrow window instead of being clamped half off-screen. If nothing fits, the card centres
 * itself and the connector is dropped; that is the honest outcome on a small viewport, and it
 * still beats a card wedged against an edge.
 */
function solve(
  rect: AnchorRect | null,
  cardHeight: number,
  preferred: Placement,
  viewport: { width: number; height: number },
): Position {
  const centered: Position = {
    top: Math.max((viewport.height - cardHeight) / 2, GUTTER),
    left: Math.max((viewport.width - CARD_WIDTH) / 2, GUTTER),
    placement: 'center',
  };
  if (!rect) return centered;

  const opposite: Record<Placement, Placement> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  // Try the requested side, then across from it, then swing to the other axis.
  const isHorizontal = preferred === 'left' || preferred === 'right';
  const order: Placement[] = [
    preferred,
    opposite[preferred],
    ...(isHorizontal ? (['bottom', 'top'] as Placement[]) : (['right', 'left'] as Placement[])),
  ];

  const clamp = (value: number, max: number) =>
    Math.min(Math.max(value, GUTTER), Math.max(max - GUTTER, GUTTER));

  for (const placement of order) {
    let top: number;
    let left: number;
    if (placement === 'right') {
      left = rect.left + rect.width + GAP;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      if (left + CARD_WIDTH + GUTTER > viewport.width) continue;
    } else if (placement === 'left') {
      left = rect.left - CARD_WIDTH - GAP;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      if (left < GUTTER) continue;
    } else if (placement === 'bottom') {
      top = rect.top + rect.height + GAP;
      left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
      if (top + cardHeight + GUTTER > viewport.height) continue;
    } else {
      top = rect.top - cardHeight - GAP;
      left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
      if (top < GUTTER) continue;
    }
    return {
      top: clamp(top, viewport.height - cardHeight),
      left: clamp(left, viewport.width - CARD_WIDTH),
      placement,
    };
  }
  return centered;
}

export interface CoachMarkProps {
  eyebrow: string;
  title: string;
  /** Plain string for the built-in script, or a rendered node for owner-authored rich text. */
  body: ReactNode;
  stepNumber: number;
  stepCount: number;
  rect: AnchorRect | null;
  preferredPlacement?: Placement;
  titleBarOffset: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  nextLabel?: string;
  isFirst: boolean;
  media?: ReactNode;
  footer?: ReactNode;
}

/** Shared card styling, so the live coach mark and the builder's preview can never drift
 *  apart — the owner is looking at the real component, not an impression of it. */
export const COACH_MARK_SHELL =
  'rounded-md border border-ink-200 bg-bone-50 p-5 shadow-lg';

export interface CoachMarkContentProps {
  eyebrow: string;
  title: string;
  body: ReactNode;
  stepNumber: number;
  stepCount: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  nextLabel?: string;
  isFirst: boolean;
  media?: ReactNode;
  footer?: ReactNode;
}

/** Everything inside the card. Split out from the positioning so the builder's live preview
 *  renders the genuine article in a static box rather than a hand-copied replica. */
export function CoachMarkContent({
  eyebrow,
  title,
  body,
  stepNumber,
  stepCount,
  onNext,
  onBack,
  onSkip,
  nextLabel,
  isFirst,
  media,
  footer,
}: CoachMarkContentProps) {
  const reduce = !!useReducedMotion();
  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
          {eyebrow}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-ink-400">
          {String(stepNumber).padStart(2, '0')} / {String(stepCount).padStart(2, '0')}
        </span>
      </div>

      <h3 className="mb-2 font-display text-[20px] leading-tight text-ink-900">{title}</h3>

      <div className="text-sm leading-relaxed text-ink-500">{body}</div>

      {media && <div className="mt-3 overflow-hidden rounded-sm border border-ink-200">{media}</div>}
      {footer && <div className="mt-3">{footer}</div>}

      {/* One segment per step rather than a single bar — it shows how much is left as a
          countable number of things, which reads shorter than a percentage. */}
      <div className="mt-4 flex gap-1" aria-hidden>
        {Array.from({ length: stepCount }, (_, i) => (
          <motion.span
            key={i}
            className={cn(
              'h-0.5 flex-1 rounded-full',
              i < stepNumber ? 'bg-brass-500' : 'bg-ink-200',
            )}
            initial={false}
            animate={{ opacity: i < stepNumber ? 1 : 0.6 }}
            transition={motionTransition(reduce, springs.snappy)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-sm px-1 text-xs font-medium text-ink-400 transition-colors duration-hover ease-brand hover:text-ink-700 focus-ring"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={onNext}>
            {nextLabel ?? 'Next'}
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </>
  );
}

export function CoachMark({
  eyebrow,
  title,
  body,
  stepNumber,
  stepCount,
  rect,
  preferredPlacement = 'right',
  titleBarOffset,
  onNext,
  onBack,
  onSkip,
  nextLabel,
  isFirst,
  media,
  footer,
}: CoachMarkProps) {
  const reduce = !!useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(220);
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  // Measured rather than estimated: body copy and optional media change the height enough that
  // a guess would put the card visibly off-centre against its target.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setCardHeight(el.offsetHeight));
    observer.observe(el);
    setCardHeight(el.offsetHeight);
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const position = solve(rect, cardHeight, preferredPlacement, viewport);
  const connector = rect && position.placement !== 'center' ? buildConnector(rect, position, cardHeight) : null;

  return (
    <>
      {connector && (
        <svg
          aria-hidden
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-[65]"
          style={{ top: titleBarOffset }}
        >
          <motion.line
            x1={connector.x1}
            y1={connector.y1 - titleBarOffset}
            x2={connector.x2}
            y2={connector.y2 - titleBarOffset}
            stroke="var(--chrome-accent)"
            strokeWidth={1}
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE_BRAND }}
          />
          <circle cx={connector.x2} cy={connector.y2 - titleBarOffset} r={2.5} fill="var(--chrome-accent)" />
        </svg>
      )}

      <motion.div
        ref={cardRef}
        role="dialog"
        aria-live="polite"
        aria-label={title}
        className={cn('fixed z-[70]', COACH_MARK_SHELL)}
        style={{ width: CARD_WIDTH }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0, top: position.top, left: position.left }}
        transition={motionTransition(reduce, springs.snappy)}
      >
        <CoachMarkContent
          eyebrow={eyebrow}
          title={title}
          body={body}
          media={media}
          footer={footer}
          stepNumber={stepNumber}
          stepCount={stepCount}
          isFirst={isFirst}
          nextLabel={nextLabel}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
        />
      </motion.div>
    </>
  );
}

/** A short line from the card's facing edge to the nearest point on the spotlight. */
function buildConnector(rect: AnchorRect, position: Position, cardHeight: number) {
  const cardMidY = position.top + cardHeight / 2;
  const cardMidX = position.left + CARD_WIDTH / 2;
  switch (position.placement) {
    case 'right':
      return { x1: position.left, y1: cardMidY, x2: rect.left + rect.width + 8, y2: rect.top + rect.height / 2 };
    case 'left':
      return { x1: position.left + CARD_WIDTH, y1: cardMidY, x2: rect.left - 8, y2: rect.top + rect.height / 2 };
    case 'bottom':
      return { x1: cardMidX, y1: position.top, x2: rect.left + rect.width / 2, y2: rect.top + rect.height + 8 };
    default:
      return { x1: cardMidX, y1: position.top + cardHeight, x2: rect.left + rect.width / 2, y2: rect.top - 8 };
  }
}
