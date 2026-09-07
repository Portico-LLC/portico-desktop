import { lazy, Suspense, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import { useMotionValueEvent } from 'framer-motion';
import { HeroArch } from '@/components/brand/HeroArch';
import { HeroDepthWash } from '@/components/brand/HeroDepthWash';
import { ThreeErrorBoundary } from '@/components/three/ThreeErrorBoundary';
import { useWebglSupported } from '@/lib/three/useWebglSupported';
import type { ScrollRef } from '@/components/three/PorticoArchModel';

const PorticoArchCanvas = lazy(() =>
  import('@/components/three/PorticoArchCanvas').then((m) => ({ default: m.PorticoArchCanvas }))
);

interface HeroSceneBackdropProps {
  reduce: boolean;
  play: boolean;
  scrollYProgress: MotionValue<number>;
}

/**
 * Replaces the flat `HeroArch` line art with the same real 3D doorway used on
 * the auth panel, so scrolling actually dollies it back in 3D instead of
 * faking depth with a CSS translateZ on a flat layer. Left-biased in
 * composition (matches `HeroArch`'s own `-left-24 ... sm:left-0` framing) so
 * it stays behind the headline column and never competes with the
 * `DashboardScene` diorama on the right.
 */
export function HeroSceneBackdrop({ reduce, play, scrollYProgress }: HeroSceneBackdropProps) {
  const webglSupported = useWebglSupported();
  const scrollRef: ScrollRef = useRef(0);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    scrollRef.current = v;
  });

  const fallback = <HeroArch reduce={reduce} />;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {webglSupported ? (
        <>
          {/* `fallback` (HeroArch) carries its own copy of this same wash, so
              this only double-renders it briefly while the 3D chunk loads —
              invisible in practice since both washes are identical/additive
              at low opacity. */}
          <HeroDepthWash />
          <Suspense fallback={fallback}>
            <ThreeErrorBoundary fallback={fallback}>
              <PorticoArchCanvas
                scrollRef={scrollRef}
                idle
                reduced={reduce}
                play={play}
                dim={0.9}
                className="absolute -left-16 bottom-0 h-full w-[70%] sm:left-0"
              />
            </ThreeErrorBoundary>
          </Suspense>
        </>
      ) : (
        fallback
      )}
    </div>
  );
}
