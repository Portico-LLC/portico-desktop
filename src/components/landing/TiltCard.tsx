import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * A card that tilts toward the cursor — `perspective`/`rotateX`/`rotateY` transforms
 * only, the same spring-driven pointer-tracking technique as `ArchMotif`/
 * `AuthBrandPanel`. No new colors or effects, just depth.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = !!useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 200, damping: 20, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 200, damping: 20, mass: 0.5 });
  const rotateX = useTransform(y, (v) => v * -8);
  const rotateY = useTransform(x, (v) => v * 8);
  const cardRef = useRef<HTMLDivElement>(null);
  // Cached on enter: reading it inside pointermove forces a layout flush every
  // frame the cursor is over the card.
  const rect = useRef<DOMRect | null>(null);
  const [hovering, setHovering] = useState(false);

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    rect.current = event.currentTarget.getBoundingClientRect();
    setHovering(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const box = rect.current ?? event.currentTarget.getBoundingClientRect();
    rect.current = box;
    rawX.set((event.clientX - box.left) / box.width - 0.5);
    rawY.set((event.clientY - box.top) / box.height - 0.5);
  };

  const handlePointerLeave = () => {
    rect.current = null;
    setHovering(false);
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      style={{
        perspective: 800,
        // Only promote to its own layer while the card is actually tilting.
        willChange: hovering ? 'transform' : undefined,
        ...(reduce ? {} : { rotateX, rotateY, transformStyle: 'preserve-3d' }),
      }}
    >
      {children}
    </motion.div>
  );
}
