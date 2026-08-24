import { motion, useReducedMotion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { springs, motionTransition } from '@/lib/motion/springs';
import { useSceneVisibility } from '@/lib/motion/useSceneVisibility';
import { CipherScene } from '@/components/landing/scenes/CipherScene';

const LINES = ['Secrets even we', 'cannot read.'];

/**
 * The dark band. One statement, set large, with the encryption happening
 * underneath it.
 *
 * Nothing here fades: the lines are masked and pushed up into place, because
 * the section is about something being sealed, and a wipe reads as a mechanism
 * where a fade reads as decoration.
 */
export function VaultBand() {
  const reduce = !!useReducedMotion();
  const { ref, play } = useSceneVisibility<HTMLDivElement>();

  return (
    <section
      id="security"
      ref={ref}
      className="relative flex min-h-[80svh] items-center overflow-hidden bg-ink-950 py-28"
    >
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 text-center">
        <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-[-0.02em] text-bone-50 sm:text-5xl">
          {LINES.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-1">
              <motion.span
                className="block"
                initial={reduce ? false : { y: '100%' }}
                whileInView={{ y: '0%' }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ ...motionTransition(reduce, springs.reposition), delay: i * 0.09 }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>

        <div className="mt-8 overflow-hidden">
          <motion.p
            // `balance` keeps the centred lines even instead of orphaning the
            // back half of "AES-256-GCM" onto its own line.
            style={{ textWrap: 'balance' }}
            className="mx-auto max-w-xl text-base leading-relaxed text-ink-300"
            initial={reduce ? false : { y: '100%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ ...motionTransition(reduce, springs.reposition), delay: 0.2 }}
          >
            Passwords, API keys, and credentials are encrypted in your browser with AES-256-GCM
            before they ever reach us. Sharing wraps the key for each person individually with
            RSA-OAEP.
          </motion.p>
        </div>

        <div className="mt-12">
          <CipherScene play={play} />
        </div>

        <motion.div
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-ink-800 bg-ink-900 px-3.5 py-1.5"
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ ...motionTransition(reduce, springs.snappy), delay: 0.45 }}
        >
          <Lock size={13} className="text-brass-400" />
          <span className="text-xs font-medium text-bone-100">Zero-knowledge by design</span>
        </motion.div>
      </div>
    </section>
  );
}
