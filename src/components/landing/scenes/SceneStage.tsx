import { useRef, type PointerEvent, type ReactNode, type CSSProperties } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Depth of each named plane, in px along Z. */
const PLANE_Z = { back: -90, mid: 0, front: 70 } as const;
export type PlaneName = keyof typeof PLANE_Z;

/**
 * The shared 3D stage every landing-page product scene sits on.
 *
 * One perspective container, three depth planes, and a single spring-smoothed
 * pointer pair fanned out with `useTransform` — the same technique as
 * `ArchMotif`/`TiltCard`, just formalised so seven scenes don't each invent
 * their own. The rest pose is a fixed three-quarter view so the scene reads as
 * a physical object even before anything animates.
 *
 * `aspectRatio` is required and applied inline: the stage therefore occupies its
 * final box on first paint, so scenes contribute zero CLS.
 */
export function SceneStage({
  children,
  aspectRatio,
  className,
  interactive = true,
}: {
  children: ReactNode;
  /**
   * Fixed aspect for the stage box. Omit it and supply a responsive
   * `aspect-[...]` utility through `className` instead when the scene needs a
   * taller box on narrow viewports — either way the box is reserved before
   * paint, so scenes stay CLS-free.
   */
  aspectRatio?: string;
  className?: string;
  interactive?: boolean;
}) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 150, damping: 20, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 150, damping: 20, mass: 0.6 });
  const stageRef = useRef<HTMLDivElement>(null);
  // Cached on enter rather than read per move: `getBoundingClientRect()` inside
  // a pointermove handler forces a layout flush on every frame.
  const rect = useRef<DOMRect | null>(null);

  const rotateY = useTransform(x, (v) => -14 + v * 8);
  const rotateX = useTransform(y, (v) => 6 - v * 6);

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    rect.current = event.currentTarget.getBoundingClientRect();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const box = rect.current ?? event.currentTarget.getBoundingClientRect();
    rect.current = box;
    rawX.set((event.clientX - box.left) / box.width - 0.5);
    rawY.set((event.clientY - box.top) / box.height - 0.5);
  };

  const handlePointerLeave = () => {
    rect.current = null;
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <div
      ref={stageRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn('relative select-none', className)}
      style={{ perspective: 1200, ...(aspectRatio ? { aspectRatio } : {}) }}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d', rotateX, rotateY }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * One depth layer inside a `SceneStage`. Scenes place their surfaces on `back`,
 * `mid`, or `front` and let the stage's rotation do the parallax for free.
 */
export function Plane({
  name,
  children,
  className,
  style,
}: {
  name: PlaneName;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const z = PLANE_Z[name];
  // Counter-scale the far plane so it keeps its apparent size after the
  // perspective divide, instead of visibly shrinking.
  const scale = name === 'back' ? 1.09 : 1;

  return (
    <div
      className={cn('absolute inset-0', className)}
      style={{
        transform: `translateZ(${z}px) scale(${scale})`,
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * `will-change: transform` only while a scene is actually playing. Left on
 * permanently it forces every scene onto its own compositor layer for the
 * lifetime of the page, which is exactly the memory cost we're avoiding.
 */
export function willChangeWhile(play: boolean): CSSProperties {
  return play ? { willChange: 'transform' } : {};
}

export type { MotionValue };
