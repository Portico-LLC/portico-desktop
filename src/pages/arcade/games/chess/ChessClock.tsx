import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ChessClockProps {
  label: string;
  isBot?: boolean;
  remainingMs: number;
  running: boolean;
}

function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10_000) return (clamped / 1000).toFixed(1);
  const totalSeconds = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Ticks locally between server syncs (100ms resolution — smooth enough for a bullet clock's
 *  under-10s tenths display) but always re-anchors to the server's `remainingMs` the instant a
 *  new one arrives, so client-side drift never accumulates across a long game. */
export function ChessClock({ label, isBot, remainingMs, running }: ChessClockProps) {
  const [display, setDisplay] = useState(remainingMs);
  const anchorRef = useRef({ value: remainingMs, at: Date.now() });

  useEffect(() => {
    anchorRef.current = { value: remainingMs, at: Date.now() };
    setDisplay(remainingMs);
  }, [remainingMs]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - anchorRef.current.at;
      setDisplay(Math.max(0, anchorRef.current.value - elapsed));
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  const critical = display < 10_000;
  const low = !critical && display < 30_000;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors duration-hover ease-brand',
        running ? 'border-brass-400 bg-brass-50' : 'border-ink-200 bg-bone-100',
      )}
    >
      <span className="text-xs font-medium text-ink-500">
        {label}
        {isBot ? ' · bot' : ''}
      </span>
      <span
        className={cn(
          'font-mono text-lg font-semibold tabular-nums',
          critical ? 'text-terracotta-600' : low ? 'text-ochre-600' : 'text-ink-900',
        )}
      >
        {formatClock(display)}
      </span>
    </div>
  );
}
