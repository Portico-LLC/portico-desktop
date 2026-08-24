import { motion } from 'framer-motion';
import { CheckSquare, Bell, FileText } from 'lucide-react';
import { EASE_BRAND } from '@/components/brand/ArchMotif';

const CHIPS = [
  { icon: CheckSquare, label: 'Task done' },
  { icon: Bell, label: 'Notify client' },
  { icon: FileText, label: 'Draft invoice' },
];

const CYCLE = 4.2;

/**
 * A rule firing: a brass token travels the chain, lighting each step as it
 * passes. Flat rather than staged in 3D, because it sits in a small bento cell
 * where perspective would only make it harder to read.
 *
 * The token rides a full-width carrier so its `x` percentages resolve against
 * the track rather than against the 6px dot, and each chip lights by fading in
 * an overlaid ring — opacity and transform only, no layout or paint thrash.
 */
export function AutomationScene({ play }: { play: boolean }) {
  return (
    <div aria-hidden className="relative flex items-stretch justify-between gap-1.5">
      {CHIPS.map((chip, i) => {
        const lit = i * 0.28;
        return (
          <div
            key={chip.label}
            className="relative flex flex-1 flex-col items-center gap-1.5 rounded-md border border-ink-200 bg-bone-50 px-2 py-2.5"
          >
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-md border border-brass-400"
              initial={{ opacity: 0 }}
              animate={play ? { opacity: [0, 0, 1, 0, 0] } : { opacity: 0 }}
              transition={
                play
                  ? {
                      duration: CYCLE,
                      times: [0, Math.max(0, lit - 0.05), lit + 0.09, lit + 0.32, 1],
                      repeat: Infinity,
                      ease: EASE_BRAND,
                    }
                  : { duration: 0.2 }
              }
            />
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink-100 text-ink-600">
              <chip.icon size={12} />
            </span>
            <p className="text-center text-[9px] font-medium leading-tight text-ink-700">
              {chip.label}
            </p>
          </div>
        );
      })}

      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
        <motion.div
          className="w-full"
          initial={{ x: '4%' }}
          animate={play ? { x: ['4%', '50%', '94%', '94%'], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={
            play
              ? { duration: CYCLE, times: [0, 0.34, 0.68, 0.86], repeat: Infinity, ease: EASE_BRAND }
              : { duration: 0.2 }
          }
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-brass-500" />
        </motion.div>
      </div>
    </div>
  );
}
