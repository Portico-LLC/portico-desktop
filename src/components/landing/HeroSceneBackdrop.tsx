import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { MotionValue } from 'framer-motion';
import { motion, useTransform } from 'framer-motion';
import { HeroArch } from '@/components/brand/HeroArch';
import { HeroDepthWash } from '@/components/brand/HeroDepthWash';

interface HeroSceneBackdropProps {
  reduce: boolean;
  play: boolean;
  scrollYProgress: MotionValue<number>;
}

const VIDEO_SRC = '/videos/hero-arch-loop.mp4';

// Soft oval fade so the rectangular clip reads as an atmospheric wash instead
// of a hard-edged box — no visible seam where the footage meets `HeroDepthWash`.
const EDGE_FADE_MASK = 'radial-gradient(85% 92% at 38% 62%, black 45%, transparent 96%)';
const edgeFadeStyle: CSSProperties = {
  maskImage: EDGE_FADE_MASK,
  WebkitMaskImage: EDGE_FADE_MASK,
};

/**
 * The hero's real doorway footage — an edge-faded, full-bleed video loop
 * behind the headline column, replacing the old procedural 3D arch. Scroll
 * still dollies the piece back (scale + fade) the way the 3D camera's Z-dolly
 * did; `play`/`reduce` gate actual playback so it never burns frames
 * off-screen, in a hidden tab, or under reduced motion. Falls back to the
 * flat `HeroArch` line art if the file fails to load.
 */
export function HeroSceneBackdrop({ reduce, play, scrollYProgress }: HeroSceneBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (play && !reduce) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [play, reduce]);

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  if (failed) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <HeroArch reduce={reduce} />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <HeroDepthWash />
      <motion.div
        style={reduce ? undefined : { scale, opacity }}
        className="absolute -left-16 bottom-0 h-full w-[70%] sm:left-0"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          style={edgeFadeStyle}
          src={VIDEO_SRC}
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onError={() => setFailed(true)}
        />
      </motion.div>
    </div>
  );
}
