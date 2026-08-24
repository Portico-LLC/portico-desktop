import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-all duration-hover ease-brand focus-ring disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm',
  {
    variants: {
      variant: {
        primary: 'bg-pine-900 text-bone-50 hover:bg-pine-950 active:scale-98',
        secondary: 'bg-bone-50 text-ink-900 border border-ink-200 hover:bg-ink-100 hover:border-ink-300',
        ghost: 'text-ink-900 hover:bg-ink-100',
        destructive: 'bg-terracotta-500 text-bone-50 hover:bg-terracotta-600 active:scale-98',
        outline: 'border border-ink-300 text-ink-900 hover:bg-ink-50',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
