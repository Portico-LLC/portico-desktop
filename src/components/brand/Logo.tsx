import { cn } from '@/lib/utils';
import { BrandMark, type BrandMarkTone } from './BrandMark';

interface LogoProps {
  tone?: BrandMarkTone;
  eyebrow?: string;
  markSize?: number;
  className?: string;
}

export function Logo({ tone = 'ink', eyebrow, markSize = 36, className }: LogoProps) {
  const onInk = tone === 'bone';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BrandMark size={markSize} tone={tone} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-2xl font-medium tracking-[-0.02em]',
            onInk ? 'text-bone-50' : 'text-ink-900'
          )}
        >
          Portico
        </span>
        {eyebrow && (
          <span
            className={cn(
              'mt-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
              onInk ? 'text-ink-400' : 'text-ink-500'
            )}
          >
            {eyebrow}
          </span>
        )}
      </div>
    </div>
  );
}
