import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { motion, useTransform } from 'framer-motion';
import { ArchMotif } from '@/components/brand/ArchMotif';

interface AuthSceneBackdropProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  reduce: boolean;
  play: boolean;
}

const VIDEO_SRC = '/videos/hero-arch-loop.mp4';

/**
 * The auth panel's real doorway footage, replacing the old procedural 3D
 * arch. Fills the panel edge-to-edge and tilts gently with the cursor via a
 * CSS 3D transform fed by the same spring-smoothed x/y pointer values
 * `ArchMotif` uses, so the "turns with the cursor" feel survives the swap
 * without three.js. The panel is nearly square while the source footage is
 * 16:9, so a plain `object-cover` crops in tight enough to slice the video's
 * own on-screen text at both edges — `object-contain` plus a modest scale
 * keeps the full width in frame instead, with the panel's own dark
 * background reading as a natural continuation of the letterboxed edges.
 * `play`/`reduce` gate playback; a dark wash keeps the logo/content/footer
 * legible on top. Falls back to `ArchMotif` if the file fails to load.
 */
export function AuthSceneBackdrop({ x, y, reduce, play }: AuthSceneBackdropProps) {
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

  const rotateY = useTransform(x, (v) => v * 6);
  const rotateX = useTransform(y, (v) => v * -6);

  if (failed) return <ArchMotif x={x} y={y} reduce={reduce} />;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ perspective: 1200 }}>
      <motion.video
        ref={videoRef}
        className="h-full w-full object-contain"
        style={reduce ? undefined : { rotateX, rotateY, scale: 1.3 }}
        src={VIDEO_SRC}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={() => setFailed(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/45 to-ink-950/70" />
    </div>
  );
}
