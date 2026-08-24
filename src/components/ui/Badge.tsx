import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-ink-100 text-ink-600',
        pine: 'bg-pine-100 text-pine-800',
        brass: 'bg-brass-100 text-brass-800',
        moss: 'bg-moss-100 text-moss-600',
        ochre: 'bg-ochre-100 text-ochre-600',
        terracotta: 'bg-terracotta-100 text-terracotta-600',
        steel: 'bg-steel-100 text-steel-600',
        outline: 'border border-ink-300 text-ink-600 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, dot, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
