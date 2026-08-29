import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { motionTransition, springs } from '@/lib/motion/springs';

function BurnRow({ label, pct, dashed, reduce }: { label: string; pct: number | null; dashed: boolean; reduce: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
        <span>{label}</span>
        <span className="tabular-nums">{pct != null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        {pct != null && (
          <motion.div
            className={cn('h-full rounded-full', !dashed && 'bg-ink-700')}
            style={{
              width: `${Math.min(pct, 100)}%`,
              transformOrigin: 'left',
              ...(dashed ? { backgroundImage: 'repeating-linear-gradient(to right, var(--brass-500) 0 6px, transparent 6px 10px)' } : {}),
            }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={motionTransition(reduce, springs.reposition)}
          />
        )}
      </div>
    </div>
  );
}

/** Solid = schedule elapsed (wall-clock fraction of the project's timeline). Dashed = effort
 *  completed (done-vs-total estimated hours, or task count if not every task is estimated) —
 *  the dash pattern is a deliberate, permanent visual distinction: this figure is a "planned"
 *  measure, never conflated with a real logged-time "actual" figure (a future feature). */
export function BurnBars({
  scheduleElapsedPct,
  effortBurnPct,
  reduce,
}: {
  scheduleElapsedPct: number | null;
  effortBurnPct: number | null;
  reduce: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <BurnRow label="Schedule elapsed" pct={scheduleElapsedPct} dashed={false} reduce={reduce} />
      <BurnRow label="Effort completed (planned)" pct={effortBurnPct} dashed reduce={reduce} />
    </div>
  );
}
