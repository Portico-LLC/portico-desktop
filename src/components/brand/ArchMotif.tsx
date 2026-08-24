import { motion, useTransform, type MotionValue } from 'framer-motion';

/** The one brand easing curve, in the array form framer-motion transitions need
 *  (the CSS `--ease-brand` token is this same cubic-bezier as a string). */
export const EASE_BRAND: [number, number, number, number] = [0.2, 0, 0, 1];

export function pathTransition(delay: number) {
  return { pathLength: { duration: 1.4, delay, ease: EASE_BRAND } };
}

/**
 * Self-drawing brand-colored line art of the arch+column logo motif, with a
 * pointer-driven parallax layer for a depth feel — entirely `perspective`/
 * `translate`/`rotate` transforms on existing brand-palette SVG, no new
 * colors, no glow/blur, no 3D library. Feed it a spring-smoothed x/y
 * MotionValue pair (see `AuthBrandPanel`) so multiple instances can share one
 * pointer-tracking source, or their own independent pair.
 */
export function ArchMotif({ x, y, reduce }: { x: MotionValue<number>; y: MotionValue<number>; reduce: boolean }) {
  const archX = useTransform(x, (v) => v * 6);
  const archY = useTransform(y, (v) => v * 6);
  const archRotateY = useTransform(x, (v) => v * 3);
  const archRotateX = useTransform(y, (v) => v * -3);
  const dotX = useTransform(x, (v) => v * 16);
  const dotY = useTransform(y, (v) => v * 16);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ perspective: 1200 }}>
      <motion.svg
        className="h-full w-full"
        viewBox="0 0 720 900"
        fill="none"
        preserveAspectRatio="xMidYMax slice"
        style={reduce ? undefined : { x: archX, y: archY, rotateX: archRotateX, rotateY: archRotateY }}
      >
        <g stroke="#1E4134" strokeOpacity="0.5">
          <motion.path
            d="M470 900 V520 C470 380 410 280 310 280 C220 280 170 360 170 500 V900"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0)}
          />
          <motion.path
            d="M560 900 V600 C560 470 510 380 430 380 C360 380 320 450 320 570 V900"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.12)}
          />
        </g>
        <g stroke="#B77B33" strokeOpacity="0.35">
          <motion.path
            d="M170 900 V480 C170 360 230 290 330 290 C420 290 470 360 470 480"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.26)}
          />
        </g>
        <g stroke="#F6F4EF" strokeOpacity="0.06">
          <motion.path
            d="M170 900 V420 C170 260 250 180 360 180 C460 180 560 270 560 460 V900"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.4)}
          />
        </g>
        <motion.path
          d="M150 900 H720"
          stroke="#B77B33"
          strokeOpacity="0.4"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={pathTransition(0.52)}
        />
      </motion.svg>

      <motion.div className="absolute right-16 top-16 grid grid-cols-3 gap-2.5" style={reduce ? undefined : { x: dotX, y: dotY }}>
        {[...Array(9)].map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-bone-50/10" />
        ))}
      </motion.div>
    </div>
  );
}
