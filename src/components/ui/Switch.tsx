import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-hover ease-brand focus-ring',
        checked ? 'bg-pine-800' : 'bg-ink-300',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full bg-bone-50 shadow-xs transition-transform duration-hover ease-brand',
          checked ? 'translate-x-[18px]' : 'translate-x-1'
        )}
      />
    </button>
  )
);
Switch.displayName = 'Switch';

export { Switch };
