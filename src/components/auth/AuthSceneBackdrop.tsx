import { lazy, Suspense, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import { useMotionValueEvent } from 'framer-motion';
import { ArchMotif } from '@/components/brand/ArchMotif';
import { ThreeErrorBoundary } from '@/components/three/ThreeErrorBoundary';
import { useWebglSupported } from '@/lib/three/useWebglSupported';
import type { TiltRef } from '@/components/three/PorticoArchModel';

const PorticoArchCanvas = lazy(() =>
  import('@/components/three/PorticoArchCanvas').then((m) => ({ default: m.PorticoArchCanvas }))
);

interface AuthSceneBackdropProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  reduce: boolean;
  play: boolean;
}

/**
 * Replaces the flat self-drawing `ArchMotif` with a real 3D doorway that (a)
 * has idle motion so it's alive even with zero pointer input, and (b) turns
 * far more convincingly with the cursor than the old 3px text nudge. Falls
 * back to the exact original `ArchMotif` whenever WebGL is unavailable, still
 * loading, or the 3D tree throws.
 */
export function AuthSceneBackdrop({ x, y, reduce, play }: AuthSceneBackdropProps) {
  const webglSupported = useWebglSupported();
  const tiltRef: TiltRef = useRef({ x: 0, y: 0 });

  useMotionValueEvent(x, 'change', (v) => {
    tiltRef.current.x = v;
  });
  useMotionValueEvent(y, 'change', (v) => {
    tiltRef.current.y = v;
  });

  const fallback = <ArchMotif x={x} y={y} reduce={reduce} />;

  if (!webglSupported) return fallback;

  return (
    <Suspense fallback={fallback}>
      <ThreeErrorBoundary fallback={fallback}>
        <PorticoArchCanvas tiltRef={tiltRef} idle reduced={reduce} play={play} className="absolute inset-0" />
      </ThreeErrorBoundary>
    </Suspense>
  );
}
