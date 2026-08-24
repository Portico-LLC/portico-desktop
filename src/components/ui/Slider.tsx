import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {}

/** Wraps a native range input for built-in keyboard/a11y support rather than a
 *  from-scratch drag implementation. Styled to match Input/Button (brass accent,
 *  brass focus ring). */
const Slider = forwardRef<HTMLInputElement, SliderProps>(({ className, ...props }, ref) => (
  <input
    type="range"
    ref={ref}
    className={cn(
      'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brass-500',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-200',
      'transition-colors duration-hover ease-brand',
      className
    )}
    {...props}
  />
));
Slider.displayName = 'Slider';

export { Slider };
