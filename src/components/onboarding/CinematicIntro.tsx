import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { ArchMotif, EASE_BRAND } from '@/components/brand/ArchMotif';
import { chaptersFor } from '@/lib/onboarding/chapters';
import type { OnboardingSubjectType } from '@/lib/onboarding/types';
import { cn } from '@/lib/utils';

/**
 * Act one: a short, skippable reel that shows the product before the live tour points at it.
 *
 * The whole surface sits on `--chrome-bg` and uses the `--chrome-*` type tokens. That is not a
 * shortcut around theming — it is the only correct choice. The ink scale **inverts** under
 * `[data-theme='dark']`, so `bg-ink-950` would render near-white for a dark-mode user and flash
 * the screen white. The chrome tokens are frozen at their dark values precisely so the sidebar
 * stays dark in both themes, and this surface wants the same guarantee.
 */
export function CinematicIntro({
  role,
  onFinish,
  onSkip,
}: {
  role: OnboardingSubjectType;
  onFinish: () => void;
  onSkip: () => void;
}) {
  const reduce = !!useReducedMotion();
  const chapters = chaptersFor(role);
  const [index, setIndex] = useState(0);
  // Reduced motion means no autoplay at all: an auto-advancing reel is exactly the kind of
  // unrequested motion the setting exists to stop.
  const [paused, setPaused] = useState(reduce);
  const [elapsed, setElapsed] = useState(0);

  const chapter = chapters[index];
  const isLast = index === chapters.length - 1;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 150, damping: 20, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 150, damping: 20, mass: 0.6 });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const box = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - box.left) / box.width - 0.5);
    rawY.set((event.clientY - box.top) / box.height - 0.5);
  };

  // Elapsed time is mirrored in a ref so the rAF loop can read and reset it without the
  // setState-inside-an-updater pattern, which double-fires under StrictMode.
  const elapsedRef = useRef(0);
  const resetElapsed = useCallback(() => {
    elapsedRef.current = 0;
    setElapsed(0);
  }, []);

  const advance = useCallback(() => {
    resetElapsed();
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  }, [isLast, onFinish, resetElapsed]);

  const back = useCallback(() => {
    resetElapsed();
    setIndex((i) => Math.max(0, i - 1));
  }, [resetElapsed]);

  const jumpTo = useCallback(
    (i: number) => {
      resetElapsed();
      setIndex(i);
    },
    [resetElapsed],
  );

  /**
   * Progress is driven by a rAF loop rather than a CSS or framer duration, because the rail has
   * to survive a pause. Animating width over `dwell` would need the animation reversed,
   * measured and restarted on every hover; tracking elapsed time makes pause a matter of not
   * adding to it.
   */
  const frameRef = useRef(0);
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      if (elapsedRef.current >= chapter.dwell) {
        advance();
        return;
      }
      setElapsed(elapsedRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [paused, chapter.dwell, advance]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onSkip();
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault();
        advance();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        back();
      } else if (event.key === ' ') {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, back, onSkip]);

  const words = chapter.title.split(' ');

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[var(--chrome-bg)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.15 : 0.4, ease: EASE_BRAND }}
      onPointerMove={handlePointerMove}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Portico"
    >
      <ArchMotif x={x} y={y} reduce={reduce} />

      {/* Chapter rail */}
      <div className="relative z-10 flex gap-1.5 px-6 pt-5 sm:px-10">
        {chapters.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => jumpTo(i)}
            className="group h-1 flex-1 overflow-hidden rounded-full bg-[var(--chrome-border-soft)] focus-ring"
            aria-label={`Chapter ${i + 1}: ${c.title}`}
          >
            <span
              className="block h-full rounded-full bg-[var(--chrome-accent)] transition-opacity group-hover:opacity-80"
              style={{
                width: i < index ? '100%' : i === index ? `${(elapsed / c.dwell) * 100}%` : '0%',
              }}
            />
          </button>
        ))}
      </div>

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6 py-8 sm:px-10 lg:flex-row lg:gap-16"
        onMouseEnter={() => !reduce && setPaused(true)}
        onMouseLeave={() => !reduce && setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={chapter.id}
            className="w-full max-w-lg lg:max-w-md"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0.15 : 0.32, ease: EASE_BRAND }}
          >
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--chrome-accent)]">
              {chapter.eyebrow}
            </p>
            {/* Per-word stagger: the line assembles itself rather than arriving as a block,
                which reads as deliberate at 34px where a whole-block fade reads as a flicker. */}
            <h2 className="font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-[var(--chrome-text)] sm:text-[34px]">
              {words.map((word, i) => (
                <motion.span
                  key={`${chapter.id}-${i}`}
                  className="inline-block"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.04, ease: EASE_BRAND }}
                >
                  {word}
                  {i < words.length - 1 ? ' ' : ''}
                </motion.span>
              ))}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--chrome-text-muted)]">
              {chapter.caption}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="w-full max-w-md lg:max-w-lg">
          <AnimatePresence mode="wait">
            {chapter.Scene && (
              <motion.div
                key={chapter.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
                transition={{ duration: reduce ? 0.15 : 0.36, ease: EASE_BRAND }}
                className="rounded-lg border border-[var(--chrome-border)] bg-[var(--chrome-surface)] p-3"
              >
                <chapter.Scene play={!paused && !reduce} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4 px-6 pb-6 sm:px-10">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-sm px-2 py-1 text-sm font-medium text-[var(--chrome-text-faint)] transition-colors duration-hover ease-brand hover:text-[var(--chrome-text)] focus-ring"
        >
          Skip intro
        </button>

        <div className="flex items-center gap-2">
          {!reduce && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-[var(--chrome-text-faint)] transition-colors duration-hover ease-brand hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)] focus-ring"
              aria-label={paused ? 'Play' : 'Pause'}
              title={paused ? 'Play (Space)' : 'Pause (Space)'}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
            </button>
          )}
          {index > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-sm px-3 py-2 text-sm font-medium text-[var(--chrome-text-muted)] transition-colors duration-hover ease-brand hover:bg-[var(--chrome-border)] hover:text-[var(--chrome-text)] focus-ring"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={advance}
            className={cn(
              'rounded-sm px-4 py-2 text-sm font-medium transition-all duration-hover ease-brand focus-ring',
              'bg-[var(--chrome-text)] text-[var(--chrome-bg)] hover:opacity-90 active:scale-[0.98]',
            )}
          >
            {isLast ? 'Show me around' : 'Next'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
