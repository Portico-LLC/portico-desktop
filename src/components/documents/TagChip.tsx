import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function TagChip({ label, onRemove, className }: TagChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-steel-100 px-2.5 py-0.5 text-xs font-medium text-steel-600',
        className,
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-steel-200/60"
          aria-label={`Remove tag ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
