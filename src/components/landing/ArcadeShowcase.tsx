import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { springs, motionTransition } from '@/lib/motion/springs';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import { TiltCard } from '@/components/landing/TiltCard';
import { Button } from '@/components/ui/Button';

const GAMES = Object.values(GAME_META);

/**
 * Three cards, one per shipped game, lit up in the same pine/brass badge idiom
 * as `CollabBento`, with an extra layer of depth on top: a cursor-tracked glow
 * (`TiltCard`'s opt-in `glow`), a `translateZ` badge/title pop inside the
 * tilt's `preserve-3d` plane, and a looping "fuse" meter that only burns
 * frames while the section is in view (`useSceneVisibility`). A gentle
 * scroll parallax between the header and the card grid keeps the section
 * from feeling static even before a visitor's cursor reaches it.
 */
export function ArcadeShowcase() {
  const reduce = !!useReducedMotion();
  const { ref, play } = useSceneVisibility<HTMLDivElement>();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const headerY = useTransform(scrollYProgress, [0, 1], [22, -22]);
  const gridY = useTransform(scrollYProgress, [0, 1], [-14, 14]);

  const cell = (distance: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: reduce
      ? { duration: 0.15 }
      : { ...motionTransition(false, springs.snappy), delay: distance * 0.08 },
  });

  return (
    <section id="arcade" ref={ref} className="mx-auto max-w-6xl overflow-hidden px-6 py-24">
      <motion.div style={reduce ? undefined : { y: headerY }}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass-700">Arcade</p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-xl font-display text-3xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-4xl">
            Deadlines aren't the only thing your team races.
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-ink-600">
            Three real-time games live inside the portal — same login, same team, zero extra
            tabs. Built for the five minutes between meetings.
          </p>
        </div>
      </motion.div>

      <motion.div className="mt-10 grid gap-4 sm:grid-cols-3" style={reduce ? undefined : { y: gridY }}>
        {GAMES.map((game, i) => (
          <motion.div key={game.label} {...cell(i)}>
            <TiltCard
              glow
              strength={10}
              className="group relative isolate h-full overflow-hidden rounded-lg border border-ink-200 bg-bone-100 p-6 transition-colors duration-300 hover:border-brass-400/60"
            >
              {/* Hairline that brightens on hover — the same brass accent, just a lighter touch than the glow. */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass-500 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />

              <div style={reduce ? undefined : { transform: 'translateZ(28px)' }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-pine-900 text-brass-400 shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                  {game.icon}
                </span>
                <h3 className="mt-4 font-display text-xl font-medium text-ink-900">{game.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{game.tagline}</p>
              </div>

              {/* Fuse meter: a looping fill instead of static dots — only spends frames while the section is on screen. */}
              <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-ink-900/10" aria-hidden>
                <motion.div
                  className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-brass-300 via-brass-500 to-brass-700"
                  style={{ transformOrigin: 'left' }}
                  animate={play ? { scaleX: [0, 1, 1, 0] } : false}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    times: [0, 0.55, 0.85, 1],
                    delay: i * 0.3,
                  }}
                />
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-10 flex items-center gap-4">
        <Link to="/signup">
          <Button
            variant="primary"
            className="transition-[transform,box-shadow] duration-hover ease-brand hover:-translate-y-0.5 hover:shadow-[0_0_28px_-6px_var(--brass-500)]"
          >
            Play for free
          </Button>
        </Link>
        <p className="text-xs text-ink-500">Included with every workspace, no add-on required.</p>
      </div>
    </section>
  );
}
