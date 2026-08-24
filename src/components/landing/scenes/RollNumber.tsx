import { motion } from 'framer-motion';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { cn } from '@/lib/utils';

/**
 * A vertically rolling number, the way a live counter ticks over.
 *
 * The strip is translated with `y` only — no text is ever re-measured or
 * rewritten, so this costs one composited transform. Pass the first value again
 * as the last entry of `values`: the roll then ends on a frame identical to the
 * one it restarts from, so the infinite repeat has no visible snap.
 *
 * Two details that are easy to get wrong:
 *
 * 1. Offsets are a fraction of `values.length`. A percentage `y` in
 *    framer-motion resolves against the animated element's own height, and that
 *    element is the whole strip, not one cell — `-100%` per step would advance
 *    by the entire strip and shoot past the end.
 * 2. Each value gets a *pair* of keyframes so it sits still and then ticks.
 *    Spacing the keyframes evenly instead leaves the counter permanently
 *    mid-transition, which reads as a rendering fault rather than as a counter.
 */
export function RollNumber({
  values,
  play,
  duration = 7.5,
  className,
}: {
  values: (string | number)[];
  play: boolean;
  duration?: number;
  className?: string;
}) {
  const count = values.length;
  const per = 1 / (count - 1); // timeline fraction per step
  const roll = per * 0.22; // portion of each step actually spent moving

  const keyframes: string[] = [];
  const times: number[] = [];
  values.forEach((_, i) => {
    const offset = `${(-i / count) * 100}%`;
    // arrive
    keyframes.push(offset);
    times.push(i === 0 ? 0 : Math.min(i * per, 1));
    // hold, until it is time to tick to the next value
    if (i < count - 1) {
      keyframes.push(offset);
      times.push(Math.min((i + 1) * per - roll, 1));
    }
  });

  return (
    <span
      className={cn('relative inline-block overflow-hidden tabular-nums leading-[1.2]', className)}
      style={{ height: '1.2em', verticalAlign: '-0.18em' }}
    >
      <motion.span
        className="flex flex-col"
        initial={{ y: '0%' }}
        animate={play ? { y: keyframes } : { y: '0%' }}
        transition={
          play
            ? { duration, times, repeat: Infinity, repeatType: 'loop', ease: EASE_BRAND }
            : { duration: 0.2 }
        }
      >
        {values.map((value, i) => (
          <span key={i} className="block flex-none leading-[1.2]" style={{ height: '1.2em' }}>
            {value}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
