import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { STATUS_META, TASK_STATUSES } from '@/lib/tasks';
import type { TaskStatus } from '@/lib/types';

/**
 * The status pill on a panel task row, and the four-way menu it opens.
 *
 * The menu is anchored `right-0` rather than `left-0` so it grows inward from
 * the row's right edge — at the panel's 320px minimum width a left-anchored
 * menu would run off the frame.
 */
export function TaskStatusMenu({
  status,
  onChange,
  disabled,
}: {
  status: TaskStatus;
  onChange: (next: TaskStatus) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const meta = STATUS_META[status];

  return (
    // The row itself is clickable (opens the edit dialog) — stop every click in
    // here from bubbling up to it.
    <div className="relative inline-block" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${meta.label}`}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring rounded-full transition-transform duration-hover ease-brand active:scale-95 active:duration-press disabled:opacity-50"
      >
        <Badge variant={meta.badge} className="cursor-pointer gap-1 pr-1.5">
          {meta.label}
          <ChevronDown size={11} className="opacity-70" />
        </Badge>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-7 z-50 w-36 animate-fade-up overflow-hidden rounded-md border border-ink-200 bg-bone-50 shadow-lg"
        >
          {TASK_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={value === status}
              onClick={() => {
                setOpen(false);
                if (value !== status) onChange(value);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors duration-hover ease-brand hover:bg-ink-100',
                value === status ? 'font-medium text-ink-900' : 'text-ink-600'
              )}
            >
              {STATUS_META[value].label}
              {value === status && <Check size={12} className="text-brass-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
