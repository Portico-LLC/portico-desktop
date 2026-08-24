import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'framer-motion';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import { KanbanScene } from '@/components/landing/scenes/KanbanScene';
import { ProjectScene } from '@/components/landing/scenes/ProjectScene';
import { InvoiceScene } from '@/components/landing/scenes/InvoiceScene';

const STEPS = [
  {
    title: 'Plan it on a board',
    body: 'Drag work across To do, In progress, Review, and Done. Dependencies, due dates, priorities, and per-project assignees, without a separate tracker.',
  },
  {
    title: 'Run it with your team',
    body: 'Employees see only the projects they are assigned to. Clients see a portal with their own work in it, and nothing else.',
  },
  {
    title: 'Get paid for it',
    body: 'Send an invoice from the project it belongs to, then watch it settle. No spreadsheet, no chasing an email thread.',
  },
];

/**
 * The page's narrative spine: scroll is the narrator.
 *
 * Rather than each block fading in on its own, one sticky stage holds three
 * scenes and the scroll position picks which is showing. That makes this the
 * only section on the page where the reader controls the pacing, which is why
 * it can carry three product surfaces without feeling like a slideshow.
 */
export function WorkflowNarrative() {
  const reduce = !!useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const { ref: sceneRef, play } = useSceneVisibility<HTMLDivElement>();
  const [step, setStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(value * STEPS.length)));
    setStep((current) => (current === next ? current : next));
  });

  // Reduced motion: no sticky stage, no scroll machinery. Three plain blocks.
  if (reduce) {
    return (
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass-700">
          How work moves
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-4xl">
          From first task to final invoice.
        </h2>
        <div className="mt-12 space-y-16">
          {STEPS.map((item, i) => (
            <div key={item.title} className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="font-mono text-xs text-brass-700">0{i + 1}</p>
                <h3 className="mt-2 font-display text-2xl font-medium text-ink-900">{item.title}</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-ink-600">{item.body}</p>
              </div>
              <div className="rounded-lg border border-ink-200 bg-bone-100 p-4">
                {i === 0 && <KanbanScene play={false} />}
                {i === 1 && <ProjectScene play={false} />}
                {i === 2 && <InvoiceScene play={false} />}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="features" className="bg-bone-50">
      {/* The track is tall; the stage inside it is sticky. Scrolling the track
          is what advances the story. */}
      <div ref={trackRef} className="relative h-[300vh]">
        <div className="sticky top-0 flex min-h-[100svh] items-center">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-[minmax(0,38ch)_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass-700">
                How work moves
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-4xl">
                From first task to final invoice.
              </h2>

              <div className="relative mt-10 h-44">
                {STEPS.map((item, i) => (
                  <motion.div
                    key={item.title}
                    className="absolute inset-x-0 top-0"
                    animate={{
                      opacity: step === i ? 1 : 0,
                      y: step === i ? 0 : 12,
                    }}
                    transition={{ duration: 0.35, ease: EASE_BRAND }}
                    style={{ pointerEvents: step === i ? 'auto' : 'none' }}
                  >
                    <h3 className="font-display text-2xl font-medium text-ink-900">{item.title}</h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-ink-600">
                      {item.body}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Step rail, doubling as the progress indicator */}
              <div className="mt-2 flex gap-2">
                {STEPS.map((item, i) => (
                  <div key={item.title} className="h-0.5 w-10 overflow-hidden rounded-full bg-ink-200">
                    <motion.div
                      className="h-full rounded-full bg-brass-500"
                      style={{ transformOrigin: 'left' }}
                      animate={{ scaleX: step >= i ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: EASE_BRAND }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div ref={sceneRef} className="relative mx-auto w-full max-w-lg lg:max-w-none">
              {[KanbanScene, ProjectScene, InvoiceScene].map((Scene, i) => (
                <motion.div
                  key={i}
                  className={i === 0 ? 'relative' : 'absolute inset-0'}
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{
                    opacity: step === i ? 1 : 0,
                    z: step === i ? 0 : -40,
                  }}
                  transition={{ duration: 0.4, ease: EASE_BRAND }}
                >
                  <Scene play={play && step === i} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
