import { useRef, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { ArchMotif } from '@/components/brand/ArchMotif';

interface AuthBrandPanelProps {
  logo: ReactNode;
  content: ReactNode;
  footer: ReactNode;
}

/**
 * The dark brand panel on the web login/signup screens — the arch motif draws itself in
 * once on mount, then the arches/dots/content drift at different depths as the cursor
 * moves for a layered-3D feel. Entirely `perspective`/`translate`/`rotate` transforms on
 * the existing brand-palette line art — no new colors, no glow/blur.
 */
export function AuthBrandPanel({ logo, content, footer }: AuthBrandPanelProps) {
  const reduce = !!useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 150, damping: 20, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 150, damping: 20, mass: 0.6 });
  const panelRef = useRef<HTMLDivElement>(null);

  const contentX = useTransform(x, (v) => v * -3);
  const contentY = useTransform(y, (v) => v * -3);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    rawX.set((event.clientX - rect.left) / rect.width - 0.5);
    rawY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <div
      ref={panelRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-950 px-14 py-12 text-bone-50 lg:flex"
    >
      <ArchMotif x={x} y={y} reduce={reduce} />

      <div className="relative z-10 animate-fade-in">{logo}</div>

      <motion.div className="relative z-10 max-w-md" style={reduce ? undefined : { x: contentX, y: contentY }}>
        {content}
      </motion.div>

      <div className="relative z-10 flex animate-fade-in items-center justify-between text-xs text-ink-500">{footer}</div>
    </div>
  );
}
