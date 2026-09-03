import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTransition, springs } from '@/lib/motion/springs';
import type { AnchorRect } from './useAnchorRect';

/** Breathing room around the target, and the radius of the cut-out. 10px matches the card
 *  radius in DESIGN.md §5.2, so the hole reads as the same family of shape as the UI it frames. */
const PAD = 8;
const RADIUS = 10;

/**
 * The dimming layer, with a hole cut over the spotlighted element.
 *
 * Built as one full-viewport SVG with a `<mask>` rather than the usual four-divs-around-a-gap
 * trick, for one reason that matters: with the hole as a single `<rect>`, moving between steps
 * is an animation of four numbers. The light *glides and reshapes* from a sidebar item to a
 * page button in one continuous motion, which is the difference between reading as a product
 * tour and reading as a modal carousel. Four divs would have to cross-fade.
 *
 * The fill is `--chrome-bg`, the frozen near-black the sidebar already uses. A theme-reactive
 * token would invert under dark mode — `ink-950` becomes near-white — and the overlay would
 * flash the app out instead of dimming it.
 */
export function SpotlightOverlay({
  rect,
  titleBarOffset,
}: {
  rect: AnchorRect | null;
  /** Height of the Electron custom title bar. The overlay starts below it so the window drag
   *  region and the macOS traffic lights stay clickable; rects are viewport coordinates, so
   *  they get shifted up by the same amount. */
  titleBarOffset: number;
}) {
  const reduce = !!useReducedMotion();
  const maskId = useId();

  const hole = rect
    ? {
        x: Math.max(rect.left - PAD, 0),
        y: Math.max(rect.top - PAD - titleBarOffset, 0),
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : // No anchor: collapse the hole to a point in the centre so the overlay is a plain dim.
      { x: window.innerWidth / 2, y: window.innerHeight / 2, width: 0, height: 0 };

  const transition = motionTransition(reduce, springs.reposition);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[60]"
      style={{ top: titleBarOffset }}
    >
      <svg className="h-full w-full" preserveAspectRatio="none">
        <defs>
          <mask id={maskId}>
            {/* White keeps the dim, black punches it out. */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              initial={false}
              animate={{ x: hole.x, y: hole.y, width: hole.width, height: hole.height }}
              transition={transition}
              rx={RADIUS}
              ry={RADIUS}
              fill="black"
            />
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="var(--chrome-bg)"
          fillOpacity={0.62}
          mask={`url(#${maskId})`}
        />

        {rect && (
          <>
            {/* A hairline brass keyline so the lit element still has an edge against the dim. */}
            <motion.rect
              initial={false}
              animate={{ x: hole.x, y: hole.y, width: hole.width, height: hole.height }}
              transition={transition}
              rx={RADIUS}
              ry={RADIUS}
              fill="none"
              stroke="var(--chrome-accent)"
              strokeWidth={1.5}
            />
            {/* One slow breath, opacity only. It composites on the GPU for free, and DESIGN.md
                reserves brass for signal — this is the signal. */}
            <motion.rect
              initial={false}
              animate={
                reduce
                  ? { x: hole.x, y: hole.y, width: hole.width, height: hole.height, opacity: 0 }
                  : {
                      x: hole.x - 4,
                      y: hole.y - 4,
                      width: hole.width + 8,
                      height: hole.height + 8,
                      opacity: [0, 0.18, 0],
                    }
              }
              transition={{
                ...transition,
                opacity: reduce
                  ? { duration: 0 }
                  : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              }}
              rx={RADIUS + 4}
              ry={RADIUS + 4}
              fill="none"
              stroke="var(--chrome-accent)"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
    </div>
  );
}
