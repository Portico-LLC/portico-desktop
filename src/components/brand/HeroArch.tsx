import { motion } from 'framer-motion';
import { pathTransition } from '@/components/brand/ArchMotif';

/**
 * The portico arch as the hero's backdrop.
 *
 * This is the brand's doorway metaphor sitting at the literal entrance of the
 * page, so it stays — but it is drawn to actually be seen. The original
 * `ArchMotif` strokes Pine-800 at 0.5 alpha over Ink-950, two colours a few
 * points apart in luminance, which is why the hero read as an empty black box.
 * Here the arches step up to Pine-500/600 and the ground line carries Brass, so
 * the structure registers while still sitting well behind the content.
 */
export function HeroArch({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Depth wash so the panel isn't a flat field. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 60% at 72% 30%, rgba(183,123,51,0.13) 0%, transparent 62%), radial-gradient(55% 55% at 12% 88%, rgba(60,125,99,0.16) 0%, transparent 68%)',
        }}
      />

      <motion.svg
        className="absolute -left-24 bottom-0 h-[92%] w-auto opacity-80 sm:left-0"
        viewBox="0 0 720 900"
        fill="none"
        preserveAspectRatio="xMinYMax meet"
      >
        <g strokeWidth="1.5" strokeLinecap="round">
          <motion.path
            d="M470 900 V520 C470 380 410 280 310 280 C220 280 170 360 170 500 V900"
            stroke="#3C7D63"
            strokeOpacity="0.5"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.15)}
          />
          <motion.path
            d="M560 900 V600 C560 470 510 380 430 380 C360 380 320 450 320 570 V900"
            stroke="#2C6350"
            strokeOpacity="0.55"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.3)}
          />
          <motion.path
            d="M170 900 V480 C170 360 230 290 330 290 C420 290 470 360 470 480"
            stroke="#B77B33"
            strokeOpacity="0.3"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.45)}
          />
          <motion.path
            d="M150 898 H700"
            stroke="#B77B33"
            strokeOpacity="0.42"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition(0.6)}
          />
        </g>
      </motion.svg>
    </div>
  );
}
