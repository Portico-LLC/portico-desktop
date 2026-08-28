import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { GAME_META } from '@/lib/arcade/gameMeta';
import { springs, motionTransition } from '@/lib/motion/springs';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import { TiltCard } from '@/components/landing/TiltCard';
import { Button } from '@/components/ui/Button';

const GAMES = Object.values(GAME_META);

/**
 * Three cards, one per shipped game, lit up in the same pine/brass badge idiom
 * as `CollabBento`. The dot trio under each tagline is the "arcade" tell —
 * a looping combo-meter that only burns frames while the section is in view.
 */
export function ArcadeShowcase() {
  const reduce = !!useReducedMotion();
  const { ref, play } = useSceneVisibility<HTMLDivElement>();

  const cell = (distance: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: reduce
      ? { duration: 0.15 }
      : { ...motionTransition(false, springs.snappy), delay: distance * 0.08 },
  });

  return (
    <section id="arcade" ref={ref} className="mx-auto max-w-6xl px-6 py-24">
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

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {GAMES.map((game, i) => (
          <motion.div key={game.label} {...cell(i)}>
            <TiltCard className="h-full rounded-lg border border-ink-200 bg-bone-100 p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-pine-900 text-brass-400">
                {game.icon}
              </span>
              <h3 className="mt-4 font-display text-xl font-medium text-ink-900">{game.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{game.tagline}</p>

              {/* Combo-meter loop: only spends frames while the section is on screen. */}
              <div className="mt-5 flex gap-1.5" aria-hidden>
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full bg-brass-500"
                    animate={
                      play
                        ? { opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }
                        : false
                    }
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: dot * 0.18,
                    }}
                  />
                ))}
              </div>
            </TiltCard>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-4">
        <Link to="/signup">
          <Button variant="primary" className="transition-transform duration-hover ease-brand hover:-translate-y-0.5">
            Play for free
          </Button>
        </Link>
        <p className="text-xs text-ink-500">Included with every workspace, no add-on required.</p>
      </div>
    </section>
  );
}
