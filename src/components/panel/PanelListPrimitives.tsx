import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

// Capped so a long list (e.g. 20 tasks) doesn't take 500ms+ to finish
// entering — rows past this index all share the same (last) delay.
const MAX_STAGGER_INDEX = 8;
const STAGGER_STEP_MS = 25;

type PanelListRowProps<T extends ElementType> = {
  as?: T;
  index?: number;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/** Shared row chrome for the panel's tab lists — staggered entrance, and for
 *  interactive rows a hover lift/shadow + a deliberately subtle press-scale
 *  (0.99, not the header icon buttons' 0.95 — a 5% shrink on a ~40px-tall
 *  full-width row reads as a much bigger wobble than the same 5% on a 28px
 *  icon square). Non-interactive rows (e.g. read-only project/event rows)
 *  skip the hover/press treatment entirely via `interactive={false}`. */
export function PanelListRow<T extends ElementType = 'div'>({
  as,
  index = 0,
  interactive = true,
  className,
  children,
  ...rest
}: PanelListRowProps<T>) {
  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      className={cn(
        'flex items-start gap-3 px-3 py-2.5 transition-[transform,background-color,box-shadow] duration-hover ease-brand animate-fade-in',
        interactive && 'cursor-pointer hover:-translate-y-px hover:bg-ink-50 hover:shadow-sm active:scale-[0.99] active:duration-press',
        className,
      )}
      style={{ animationDelay: `${Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS}ms` }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function PanelEmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center animate-fade-in">
      {icon}
      <p className="text-sm text-ink-400">{message}</p>
    </div>
  );
}

export function PanelSkeletonList({ count, rowHeight = 'h-12' }: { count: number; rowHeight?: string }) {
  return (
    <div className="space-y-2 p-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-fade-in" style={{ animationDelay: `${Math.min(i, MAX_STAGGER_INDEX) * STAGGER_STEP_MS}ms` }}>
          <Skeleton className={cn('w-full', rowHeight)} />
        </div>
      ))}
    </div>
  );
}
