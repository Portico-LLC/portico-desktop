import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface CountdownRingProps {
  deadlineAt: number;
  durationMs: number;
  /** Rendered pixel size (square) — the internal SVG viewBox stays a fixed 64-unit
   *  coordinate system regardless, scaled to fit via `style`, so RADIUS/CIRCUMFERENCE never
   *  need to change. A plain `h-10 w-10` className would NOT shrink this — the `<svg>`'s own
   *  width/height attributes would still win, overflowing a smaller container instead of
   *  scaling into it. */
  size?: number;
  className?: string;
}

/** A CSS-transition-driven countdown ring (not a per-frame React re-render) — cheap and
 *  smooth. The two-step "set to 0, then flip on next frame" is the standard trick for making
 *  a CSS transition actually animate from a freshly-set starting value instead of jumping.
 *  Shared by Word Bomb's fuse and Doodle Relay's round timer — deliberately generic (just a
 *  deadline + duration), no per-game logic. */
export function CountdownRing({ deadlineAt, durationMs, size = 64, className }: CountdownRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, (deadlineAt - Date.now()) / 1000));

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = '0';
    const raf = requestAnimationFrame(() => {
      circle.style.transition = `stroke-dashoffset ${durationMs}ms linear`;
      circle.style.strokeDashoffset = String(CIRCUMFERENCE);
    });
    return () => cancelAnimationFrame(raf);
  }, [deadlineAt, durationMs]);

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, (deadlineAt - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadlineAt]);

  const danger = secondsLeft <= 3;
  const warn = secondsLeft <= 6 && !danger;

  return (
    <div className={cn('relative flex flex-shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={32} cy={32} r={RADIUS} fill="none" strokeWidth={5} className="stroke-ink-200" />
        <circle
          ref={circleRef}
          cx={32}
          cy={32}
          r={RADIUS}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className={cn(
            'transition-colors duration-hover ease-brand',
            danger ? 'stroke-terracotta-500' : warn ? 'stroke-ochre-500' : 'stroke-moss-500',
          )}
        />
      </svg>
      <span
        className={cn(
          'absolute font-semibold tabular-nums',
          size < 56 ? 'text-xs' : 'text-sm',
          danger ? 'text-terracotta-600' : 'text-ink-900',
        )}
      >
        {secondsLeft.toFixed(1)}
      </span>
    </div>
  );
}
