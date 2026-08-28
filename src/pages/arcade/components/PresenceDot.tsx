import { cn } from '@/lib/utils';

/** 6px filled dot, pulsing only while online — matches DESIGN.md's realtime-state convention
 *  ("Dot = 6px filled circle, pulse only for realtime states"). */
export function PresenceDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span className={cn('relative flex h-2.5 w-2.5 flex-shrink-0', className)}>
      {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss-500 opacity-60" />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', online ? 'bg-moss-500' : 'bg-ink-300')} />
    </span>
  );
}
