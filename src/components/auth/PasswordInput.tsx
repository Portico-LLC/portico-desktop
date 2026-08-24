import { useState, forwardRef } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface PasswordInputProps {
  id: string;
  placeholder?: string;
  autoComplete?: string;
  register?: UseFormRegisterReturn;
  className?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ id, placeholder, autoComplete, register, className }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <Input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn('pl-10 pr-10', className)}
          {...register}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-ink-400 transition-colors duration-hover ease-brand hover:bg-ink-100 hover:text-ink-700"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
