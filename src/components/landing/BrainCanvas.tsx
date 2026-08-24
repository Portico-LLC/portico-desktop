import { motion, useReducedMotion } from 'framer-motion';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import { GraphScene } from '@/components/landing/scenes/GraphScene';

/**
 * Brain, laid out as a canvas: the graph owns the plane and the copy floats on
 * top of it in a single offset card, rather than the copy-column-plus-three-
 * cards shape used elsewhere on the page.
 */
export function BrainCanvas() {
  const reduce = !!useReducedMotion();
  const { ref, play } = useSceneVisibility<HTMLDivElement>();

  return (
    <section id="ai" className="mx-auto max-w-6xl px-6 pb-12 pt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass-700">Brain</p>

      <div ref={ref} className="relative mt-6">
        {/* The graph plane */}
        <div className="rounded-lg border border-ink-200 bg-bone-100 p-6 sm:p-10">
          <div className="mx-auto max-w-3xl">
            <GraphScene play={play} />
          </div>
        </div>

        {/* The copy, offset over it */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: EASE_BRAND }}
          className="relative z-10 mx-auto -mt-8 max-w-xl rounded-lg border border-ink-200 bg-bone-50 p-7 shadow-md sm:-mt-10 lg:mx-0 lg:-mt-12"
        >
          <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-4xl">
            Your data trains nothing.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-600">
            Brain reads your studio's projects, tasks, and clients so it can answer questions and
            draft work, the way a new hire would. It runs on OpenAI's API, and neither we nor OpenAI
            use what it sees to train a model. Vault contents are never part of it.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
