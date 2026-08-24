import { cn } from '@/lib/utils';

export interface SegmentedControlOption<T extends string> {
  id: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('flex gap-1 rounded-sm bg-ink-100 p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors duration-hover ease-brand',
            value === opt.id ? 'bg-bone-50 text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-700'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
