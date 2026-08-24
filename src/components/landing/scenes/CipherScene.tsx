import { motion } from 'framer-motion';
import { EASE_BRAND } from '@/components/brand/ArchMotif';

const PLAIN = 'sk_live_9f4c2ba77e10';
const CIPHER = 'x8QZm4:tR#7vLpA2eK9';

const CYCLE = 7;

/**
 * Plaintext turning into ciphertext, character by character, left to right.
 *
 * Both strings are rendered once and stacked; the wave is a per-character
 * opacity cross-fade between the two layers. Nothing is re-measured, no
 * `textContent` is touched, and the glyph grid never reflows.
 */
export function CipherScene({ play }: { play: boolean }) {
  const length = Math.max(PLAIN.length, CIPHER.length);

  return (
    <div aria-hidden className="flex justify-center font-mono text-[13px] sm:text-base">
      {Array.from({ length }).map((_, i) => {
        // Each column flips slightly after the one before it.
        const at = 0.12 + (i / length) * 0.42;
        const transition = play
          ? {
              duration: CYCLE,
              times: [0, at, Math.min(at + 0.05, 1), 0.86, 1],
              repeat: Infinity,
              ease: EASE_BRAND,
            }
          : { duration: 0.2 };

        return (
          <span key={i} className="relative inline-block" style={{ width: '0.62em' }}>
            <motion.span
              className="block text-center text-pine-200"
              initial={{ opacity: 1 }}
              animate={play ? { opacity: [1, 1, 0, 0, 1] } : { opacity: 1 }}
              transition={transition}
            >
              {PLAIN[i] ?? ' '}
            </motion.span>
            <motion.span
              className="absolute inset-0 block text-center text-brass-400"
              initial={{ opacity: 0 }}
              animate={play ? { opacity: [0, 0, 1, 1, 0] } : { opacity: 0 }}
              transition={transition}
            >
              {CIPHER[i] ?? ' '}
            </motion.span>
          </span>
        );
      })}
    </div>
  );
}
