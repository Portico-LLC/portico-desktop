import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { SceneStage, Plane, willChangeWhile } from './SceneStage';

const TEAM = ['Noor Haddad', 'Ilias Berg', 'Wren Okafor'];

const MILESTONES = [
  { label: 'Discovery', done: true },
  { label: 'Art direction', done: true },
  { label: 'Build', done: false },
];

/**
 * A project filling up: the bar advances, then the people working on it arrive
 * out of depth. The bar is `scaleX` from the left, never `width`.
 */
export function ProjectScene({ play }: { play: boolean }) {
  return (
    <SceneStage aspectRatio="4 / 3" className="w-full">
      <Plane name="mid" className="flex items-center justify-center" style={willChangeWhile(play)}>
        <div className="w-[92%] overflow-hidden rounded-lg border border-ink-300 bg-bone-50 shadow-lg">
          <div className="flex items-center justify-between border-b border-ink-200 bg-bone-100 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-ink-900">Hallam &amp; Wick site</p>
            <Badge variant="pine" className="!px-2 !py-0 !text-[9px]">
              In progress
            </Badge>
          </div>

          <div className="px-3.5 py-3.5">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-medium text-ink-600">Overall progress</p>
              <p className="text-[10px] font-semibold tabular-nums text-ink-900">68%</p>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
              <motion.div
                className="h-full rounded-full bg-pine-600"
                style={{ transformOrigin: 'left' }}
                initial={{ scaleX: 0.18 }}
                animate={play ? { scaleX: 0.68 } : { scaleX: 0.18 }}
                transition={{ duration: 1.3, ease: EASE_BRAND, delay: 0.25 }}
              />
            </div>

            <div className="mt-3.5 space-y-1.5">
              {MILESTONES.map((milestone, i) => (
                <motion.div
                  key={milestone.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -6 }}
                  animate={play ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                  transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.5 + i * 0.12 }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      milestone.done ? 'bg-pine-600' : 'bg-ink-300'
                    }`}
                  />
                  <p className="text-[10px] text-ink-600">{milestone.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-3.5 flex items-center gap-2 border-t border-ink-200 pt-3">
              <div className="flex -space-x-1.5">
                {TEAM.map((name, i) => (
                  <motion.div
                    key={name}
                    style={{ transformStyle: 'preserve-3d' }}
                    initial={{ opacity: 0, z: -40, scale: 0.8 }}
                    animate={play ? { opacity: 1, z: 0, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.45, ease: EASE_BRAND, delay: 0.95 + i * 0.11 }}
                  >
                    <Avatar
                      name={name}
                      size="sm"
                      className="!h-5 !w-5 !text-[8px] ring-2 ring-bone-50"
                    />
                  </motion.div>
                ))}
              </div>
              <p className="text-[9px] text-ink-400">3 people on this project</p>
            </div>
          </div>
        </div>
      </Plane>
    </SceneStage>
  );
}
