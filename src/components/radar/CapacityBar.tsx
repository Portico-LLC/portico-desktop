import { motion } from 'framer-motion';
import { motionTransition, springs } from '@/lib/motion/springs';
import { cn } from '@/lib/utils';

// The track visually represents 0-150% utilization, not 0-100% — otherwise an overloaded
// person (>100%) would have nowhere on the bar to show it. The 100% mark sits at ~66.7% of
// the track width, with a hairline tick there and a hatched terracotta segment past it.
const RANGE_MAX = 150;

export function CapacityBar({ pct, reduce }: { pct: number; reduce: boolean }) {
  const hundredMarkPct = (100 / RANGE_MAX) * 100;
  const widthPct = (Math.min(pct, RANGE_MAX) / RANGE_MAX) * 100;
  const normalWidthPct = Math.min(widthPct, hundredMarkPct);
  const overflowWidthPct = Math.max(0, widthPct - hundredMarkPct);
  const baseColor = pct > 100 ? 'bg-terracotta-500' : pct > 70 ? 'bg-ochre-500' : 'bg-moss-500';

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`${pct}% of weekly capacity`}>
      <motion.div
        className={cn('absolute inset-y-0 left-0 rounded-full', baseColor)}
        style={{ width: `${normalWidthPct}%`, transformOrigin: 'left' }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={motionTransition(reduce, springs.reposition)}
      />
      {overflowWidthPct > 0 && (
        <motion.div
          className="absolute inset-y-0 rounded-r-full bg-terracotta-600"
          style={{
            left: `${hundredMarkPct}%`,
            width: `${overflowWidthPct}%`,
            transformOrigin: 'left',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 3px, transparent 3px 6px)',
          }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={motionTransition(reduce, springs.reposition)}
        />
      )}
      <div className="absolute inset-y-0 w-px bg-ink-500/40" style={{ left: `${hundredMarkPct}%` }} aria-hidden />
    </div>
  );
}
