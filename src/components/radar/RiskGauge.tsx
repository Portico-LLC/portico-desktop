import { motion } from 'framer-motion';
import { motionTransition, springs } from '@/lib/motion/springs';
import type { RadarBand } from '@/lib/types';

const BAND_COLOR_VAR: Record<RadarBand, string> = {
  low: 'var(--moss-500)',
  moderate: 'var(--ochre-500)',
  elevated: 'var(--terracotta-400)',
  critical: 'var(--terracotta-600)',
};

const R = 40;
const CX = 50;
const CY = 46;
const ARC_LENGTH = Math.PI * R; // half-circle
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

/** A semicircle gauge for a 0-100 risk score. The arc fill animates (`strokeDashoffset`); the
 *  numeral itself never counts up — an audited figure ticking through wrong intermediate
 *  values would undermine the "this is real math, not a guess" premise the whole feature
 *  rests on. `play` gates the slow pulse on critical-band gauges to on-screen only, via the
 *  caller's `useSceneVisibility` — it's also what makes reduced-motion turn the pulse off. */
export function RiskGauge({
  score,
  band,
  reduce,
  play,
  size = 96,
}: {
  score: number | null;
  band: RadarBand | null;
  reduce: boolean;
  play: boolean;
  size?: number;
}) {
  const colorVar = band ? BAND_COLOR_VAR[band] : 'var(--ink-300)';
  const fraction = score != null ? score / 100 : 0;

  return (
    <div className="relative" style={{ width: size, height: size * 0.62 }}>
      <svg viewBox="0 0 100 62" className="h-full w-full" aria-hidden>
        <path d={ARC_PATH} fill="none" stroke="var(--border)" strokeWidth={8} strokeLinecap="round" />
        {score != null && (
          <motion.path
            d={ARC_PATH}
            fill="none"
            stroke={colorVar}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            initial={reduce ? false : { strokeDashoffset: ARC_LENGTH }}
            animate={{ strokeDashoffset: ARC_LENGTH * (1 - fraction) }}
            transition={motionTransition(reduce, springs.reposition)}
          />
        )}
        {score != null && band === 'critical' && (
          <motion.path
            d={ARC_PATH}
            fill="none"
            stroke={colorVar}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH * (1 - fraction)}
            animate={play ? { opacity: [0.35, 0.6, 0.35] } : { opacity: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="font-display text-xl font-semibold tabular-nums text-ink-900">{score ?? '—'}</span>
      </div>
    </div>
  );
}
