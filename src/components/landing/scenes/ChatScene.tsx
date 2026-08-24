import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { SceneStage, Plane, willChangeWhile } from './SceneStage';

const CYCLE = 7;

/**
 * A conversation happening. Typing dots, their message, then yours.
 *
 * The whole loop is opacity and `x` only. The window is sized to fill its
 * stage rather than floating in the middle of it, so the bento cell it lives
 * in does not stretch around a small object.
 */
export function ChatScene({ play }: { play: boolean }) {
  const at = (times: number[]) =>
    play ? { duration: CYCLE, times, repeat: Infinity, ease: EASE_BRAND } : { duration: 0.2 };

  return (
    <SceneStage aspectRatio="1 / 1" className="w-full" interactive={false}>
      <Plane name="mid" className="flex" style={willChangeWhile(play)}>
        <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink-300 bg-bone-50 shadow-lg">
          {/* Channel header */}
          <div className="flex flex-none items-center gap-2 border-b border-ink-200 bg-bone-100 px-3 py-2.5">
            <Avatar name="Wren Okafor" size="sm" className="!h-6 !w-6 !text-[9px]" />
            <div>
              <p className="text-[11px] font-medium leading-none text-ink-900">Wren Okafor</p>
              <motion.p
                className="mt-1 text-[9px] leading-none text-brass-600"
                animate={play ? { opacity: [0, 1, 1, 0, 0] } : { opacity: 0 }}
                transition={at([0, 0.04, 0.17, 0.21, 1])}
              >
                typing…
              </motion.p>
            </div>
          </div>

          {/* Thread */}
          <div className="flex flex-1 flex-col justify-end gap-2 px-3 py-3">
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg rounded-bl-sm border border-ink-200 bg-bone-100 px-2.5 py-1.5 text-[11px] leading-snug text-ink-900">
                Client approved the type direction.
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg rounded-br-sm bg-pine-900 px-2.5 py-1.5 text-[11px] leading-snug text-bone-50">
                Good. I'll close out the milestone.
              </div>
            </div>

            {/* Theirs, arriving after the typing indicator */}
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, x: -8 }}
              animate={play ? { opacity: [0, 0, 1, 1, 1], x: [-8, -8, 0, 0, 0] } : { opacity: 0, x: -8 }}
              transition={at([0, 0.21, 0.29, 0.95, 1])}
            >
              <div className="max-w-[80%] rounded-lg rounded-bl-sm border border-ink-200 bg-bone-100 px-2.5 py-1.5 text-[11px] leading-snug text-ink-900">
                Shall I send the invoice for stage two?
              </div>
            </motion.div>

            {/* Yours */}
            <motion.div
              className="flex flex-col items-end"
              initial={{ opacity: 0, x: 8 }}
              animate={play ? { opacity: [0, 0, 1, 1, 1], x: [8, 8, 0, 0, 0] } : { opacity: 0, x: 8 }}
              transition={at([0, 0.46, 0.55, 0.95, 1])}
            >
              <div className="max-w-[80%] rounded-lg rounded-br-sm bg-pine-900 px-2.5 py-1.5 text-[11px] leading-snug text-bone-50">
                Already sent. Thanks Wren.
              </div>
              <p className="mt-1 text-[9px] text-ink-400">You · 3:42 PM</p>
            </motion.div>
          </div>

          {/* Composer */}
          <div className="flex flex-none items-center gap-2 border-t border-ink-200 px-3 py-2.5">
            <div className="flex-1 rounded-sm border border-ink-200 bg-bone-100 px-2 py-1.5 text-[10px] text-ink-400">
              Message Wren
            </div>
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-sm bg-pine-900 text-bone-50">
              <Send size={11} />
            </span>
          </div>
        </div>
      </Plane>
    </SceneStage>
  );
}
