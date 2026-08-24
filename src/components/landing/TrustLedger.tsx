import { motion, useReducedMotion } from 'framer-motion';
import { EASE_BRAND } from '@/components/brand/ArchMotif';

const ROWS = [
  {
    title: 'Encrypted before it leaves you',
    body: 'Vault items are sealed in your browser with AES-256-GCM. The server only ever stores ciphertext it cannot read.',
  },
  {
    title: 'Keys wrapped per person',
    body: 'Sharing a vault wraps its key individually for each member with RSA-OAEP. There is no shared master key.',
  },
  {
    title: 'Not even us',
    body: 'We cannot decrypt your Vault, hand it over in readable form, or recover it if you lose both passphrase and recovery kit.',
  },
  {
    title: 'No training, ever',
    body: 'Your studio and client data is never used to train an AI model, ours or OpenAI’s.',
  },
  {
    title: 'OpenAI, under our account',
    body: 'Brain runs on OpenAI’s API, whose data terms exclude API traffic from model training. That is a different policy from the consumer ChatGPT app.',
  },
  {
    title: 'Brain cannot see the Vault',
    body: 'It only ever receives the project, task, and client records already visible to your role.',
  },
];

/**
 * The six commitments behind Vault and Brain, enumerated.
 *
 * These used to live as two separate three-card sections that were structurally
 * identical and sat next to each other. Merging them into one ledger removes
 * the duplicate rhythm and lets the two feature sections above make a single
 * statement each instead of repeating their own detail.
 *
 * The rule wipes in before the text, left to right, at a steady interval: the
 * cadence of something being entered into a book.
 */
export function TrustLedger() {
  const reduce = !!useReducedMotion();

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <h2 className="sr-only">Security and AI commitments</h2>

      <div>
        {ROWS.map((row, i) => (
          <div key={row.title} className="relative">
            <motion.span
              className="absolute inset-x-0 top-0 block h-px bg-ink-200"
              style={{ transformOrigin: 'left' }}
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.18, ease: EASE_BRAND, delay: i * 0.09 }}
            />
            <motion.div
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 py-5 sm:grid-cols-[3.5rem_1fr]"
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.3, ease: EASE_BRAND, delay: i * 0.09 + 0.12 }}
            >
              <span className="font-mono text-xs tabular-nums text-brass-700">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="font-medium text-ink-900">{row.title}</p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-600">{row.body}</p>
              </div>
            </motion.div>
          </div>
        ))}
        {/* Closing rule, so the ledger reads as a finished block */}
        <motion.span
          className="block h-px bg-ink-200"
          style={{ transformOrigin: 'left' }}
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.18, ease: EASE_BRAND, delay: ROWS.length * 0.09 }}
        />
      </div>
    </section>
  );
}
