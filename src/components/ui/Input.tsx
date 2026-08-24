import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-sm border border-ink-300 bg-bone-50 px-3 py-2 text-base placeholder:text-ink-400 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-200 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-hover ease-brand',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export { Input };
