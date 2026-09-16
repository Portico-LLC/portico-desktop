import { motion } from 'framer-motion';
import { Briefcase, CheckSquare, Users, Check } from 'lucide-react';
import { EASE_BRAND } from '@/components/brand/ArchMotif';
import { SceneStage, Plane, willChangeWhile } from './SceneStage';
import { RollNumber } from './RollNumber';

const STATS = [
  { label: 'Active projects', value: '7', icon: Briefcase, tint: 'bg-pine-600 text-bone-50' },
  { label: 'Due this week', value: '14', icon: CheckSquare, tint: 'bg-brass-600 text-bone-50' },
  { label: 'Clients', value: null, icon: Users, tint: 'bg-moss-600 text-bone-50' },
];

const PROJECTS = [
  { name: 'Rivelle brand system', pct: 0.82 },
  { name: 'Hallam & Wick site', pct: 0.68, live: true },
  { name: 'Osterlen packaging', pct: 0.31 },
];

/**
 * The hero diorama: one studio dashboard, read as a single object.
 *
 * Composed as an app window on the mid plane with a second window peeking out
 * behind it and a toast riding in front, so the depth comes from overlap rather
 * than from scattering fragments across the stage. Two beats loop on
 * deliberately different periods (7.5s and 6.4s) so it never turns metronomic;
 * everything else plays once on entry and holds. Progress fills use `scaleX`,
 * never `width`.
 */
export function DashboardScene({ play }: { play: boolean }) {
  return (
    // Taller box on narrow viewports: the window keeps its natural height, so a
    // 4:3 stage is shorter than its content on phones and the front-plane toast
    // ends up landing on top of the project list.
    <SceneStage className="aspect-[3/4] w-full sm:aspect-[4/3]">
      {/* Back — an ambient glow, not a second hard-edged surface: a bordered
          rect here would show through the now-translucent glass window above
          it as a visible seam, so this is a soft blurred blob with no edge to
          catch. */}
      <Plane name="back" className="flex items-center justify-center" style={willChangeWhile(play)}>
        <div className="h-[70%] w-[70%] -translate-y-4 translate-x-8 rounded-full bg-gradient-to-br from-brass-700/40 via-pine-800/30 to-transparent blur-3xl" />
      </Plane>

      {/* Mid — the window itself */}
      <Plane name="mid" className="flex items-center justify-center" style={willChangeWhile(play)}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.15 }}
          className="w-[94%] overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-white/10 via-ink-950/45 to-ink-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.03),0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl backdrop-saturate-150"
        >
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-bone-50/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-bone-50/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-bone-50/30" />
            <p className="ml-1.5 text-[9px] font-medium text-bone-200/70">Portico</p>
          </div>

          <div className="p-3">
            {/* Stat row */}
            <div className="flex gap-2">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.3 + i * 0.07 }}
                  className="flex-1 rounded-md border border-white/10 bg-white/5 p-2 backdrop-blur-md"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-sm ${stat.tint}`}
                  >
                    <stat.icon size={11} />
                  </span>
                  <p className="mt-1.5 text-[8px] font-medium leading-none text-bone-200/60">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-none text-bone-50 tabular-nums">
                    {stat.value ?? (
                      <RollNumber values={[8, 9, 10, 11, 12, 8]} play={play} duration={7.5} />
                    )}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Projects */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: EASE_BRAND, delay: 0.5 }}
              className="mt-2.5 rounded-md border border-white/10 bg-white/5 backdrop-blur-md"
            >
              <div className="border-b border-white/10 px-2.5 py-1.5">
                <p className="text-[9px] font-medium text-bone-50">Recent projects</p>
              </div>
              <div className="space-y-2 px-2.5 py-2.5">
                {PROJECTS.map((project, i) => (
                  <div key={project.name}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-[9px] font-medium text-bone-200/80">{project.name}</p>
                      <p className="text-[8px] tabular-nums text-bone-200/50">
                        {Math.round(project.pct * 100)}%
                      </p>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-pine-600"
                        style={{ transformOrigin: 'left' }}
                        initial={{ scaleX: project.live ? 0.42 : project.pct }}
                        whileInView={{ scaleX: project.pct }}
                        viewport={{ once: true }}
                        transition={{
                          duration: project.live ? 1.1 : 0.7,
                          ease: EASE_BRAND,
                          delay: project.live ? 1.3 : 0.7 + i * 0.08,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Plane>

      {/* Front — the paid-invoice toast, the continuously looping beat */}
      <Plane
        name="front"
        className="flex items-end justify-end pb-[15%] pr-[7%]"
        style={willChangeWhile(play)}
      >
        <motion.div
          className="flex items-center gap-2 rounded-md border border-white/15 bg-ink-950/50 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-lg backdrop-saturate-150"
          initial={{ opacity: 0, y: 10 }}
          animate={play ? { opacity: [0, 1, 1, 0], y: [10, 0, 0, -8] } : { opacity: 0, y: 10 }}
          transition={
            play
              ? { duration: 6.4, times: [0, 0.1, 0.74, 0.86], repeat: Infinity, ease: EASE_BRAND }
              : { duration: 0.2 }
          }
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-moss-500 text-bone-50">
            <Check size={11} strokeWidth={3} />
          </span>
          <span className="text-[10px] font-medium text-bone-50">Invoice PT-2214 paid</span>
          <span className="text-[10px] tabular-nums text-bone-200/60">$4,820.00</span>
        </motion.div>
      </Plane>
    </SceneStage>
  );
}
