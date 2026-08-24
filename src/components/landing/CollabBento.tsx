import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Share2, Users, Workflow } from 'lucide-react';
import { springs, motionTransition } from '@/lib/motion/springs';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import { ChatScene } from '@/components/landing/scenes/ChatScene';
import { AutomationScene } from '@/components/landing/scenes/AutomationScene';
import { TiltCard } from '@/components/landing/TiltCard';

/**
 * The mosaic. Five unequal cells, entering as a radial stagger measured from
 * the chat cell so the eye is told where the centre of gravity is before it
 * reads a word.
 */
export function CollabBento() {
  const reduce = !!useReducedMotion();
  const { ref, play } = useSceneVisibility<HTMLDivElement>();
  const sectionRef = useRef<HTMLElement>(null);

  // Distance from the chat cell (index 0), in cell-hops, drives the delay.
  const cell = (distance: number) => ({
    initial: reduce ? false : { opacity: 0, scale: 0.97 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: '-80px' },
    transition: reduce
      ? { duration: 0.15 }
      : { ...motionTransition(false, springs.snappy), delay: distance * 0.05 },
  });

  return (
    <section ref={sectionRef} id="collaboration" className="mx-auto max-w-6xl px-6 py-24">
      <div className="flex items-baseline gap-4 border-t border-ink-200 pt-6">
        <span className="font-mono text-xs text-brass-700">01</span>
        <h2 className="font-display text-3xl font-semibold tracking-[-0.02em] text-ink-900 sm:text-4xl">
          Everyone in one room.
        </h2>
      </div>

      <div ref={ref} className="mt-10 grid gap-4 lg:grid-cols-12">
        {/* Chat, the anchor cell */}
        <motion.div
          {...cell(0)}
          className="flex flex-col rounded-lg border border-ink-200 bg-bone-100 p-5 lg:col-span-5 lg:row-span-2"
        >
          <h3 className="font-display text-xl font-medium text-ink-900">Team chat</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Real-time channels and direct messages, in the same place as the work they are about.
          </p>
          <div className="mt-5 flex flex-1 items-center">
            <ChatScene play={play} />
          </div>
        </motion.div>

        {/* Client portal */}
        <motion.div
          {...cell(1)}
          className="rounded-lg border border-ink-200 bg-pine-950 p-6 text-bone-50 lg:col-span-7"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-pine-900 text-brass-400">
            <Users size={17} />
          </span>
          {/* Explicit colour: the `@layer base` heading rule sets `color` on the
              element itself, so a parent's `text-bone-50` does not reach it. */}
          <h3 className="mt-4 font-display text-xl font-medium text-bone-50">
            A portal your clients will use
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-pine-100/80">
            Every client gets a private, branded space to follow projects, approve work, read
            invoices, and talk to you. No logins to chase, no attachments lost in a thread.
          </p>
        </motion.div>

        {/* Automations */}
        <motion.div
          {...cell(2)}
          className="rounded-lg border border-ink-200 bg-bone-100 p-6 lg:col-span-4"
        >
          <div className="flex items-center gap-2">
            <Workflow size={15} className="text-ink-500" />
            <h3 className="font-display text-lg font-medium text-ink-900">Automations</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Let the busywork fire itself.
          </p>
          <div className="mt-4">
            <AutomationScene play={play} />
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink-400">
            Trigger notifications, task creation, and status changes from events you already track.
          </p>
        </motion.div>

        {/* Brain teaser, the one other tilt on the page */}
        <motion.div {...cell(3)} className="lg:col-span-3">
          <TiltCard className="h-full rounded-lg border border-ink-200 bg-bone-100 p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-pine-900 text-brass-400">
              <Share2 size={17} />
            </span>
            <h3 className="mt-4 font-display text-lg font-medium text-ink-900">Brain</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Ask your workspace a question and get an answer with the receipts.
            </p>
            <p className="mt-4 rounded-sm border border-ink-200 bg-bone-50 px-2.5 py-2 text-xs italic text-ink-500">
              “What is still open on Hallam &amp; Wick?”
            </p>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  );
}
