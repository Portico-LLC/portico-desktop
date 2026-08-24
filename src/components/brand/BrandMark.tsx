import { cn } from '@/lib/utils';

/**
 * Portico brand mark — the gold-arch icon from the studio logo, rendered on
 * a dark Pine tile.
 *
 * tone:
 *  - "ink"  -> wraps the icon in a dark tile (for light/bone surfaces, where
 *              the icon otherwise wouldn't have enough contrast)
 *  - "bone" -> renders the icon alone at full size (for surfaces that are
 *              already dark, e.g. the sidebar / auth brand panel)
 */

const TILE_BG = '#0E211A';

export type BrandMarkTone = 'ink' | 'bone';

interface BrandMarkProps {
  size?: number;
  tone?: BrandMarkTone;
  className?: string;
}

export function BrandMark({ size = 36, tone = 'ink', className }: BrandMarkProps) {
  if (tone === 'bone') {
    return (
      <img
        src="/portico-icon.png"
        alt="Portico"
        draggable={false}
        className={cn('select-none object-contain', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn('inline-flex flex-shrink-0 items-center justify-center rounded-[22%]', className)}
      style={{ width: size, height: size, backgroundColor: TILE_BG }}
    >
      <img
        src="/portico-icon.png"
        alt="Portico"
        draggable={false}
        className="select-none object-contain"
        style={{ width: size * 0.68, height: size * 0.68 }}
      />
    </div>
  );
}
