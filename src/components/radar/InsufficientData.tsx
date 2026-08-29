import type { RadarUnavailableReason } from '@/lib/types';
import { reasonLabel } from './reasonCopy';

/** The single rendering for "this figure couldn't be computed" — used anywhere a radar value
 *  is `null`, so it never gets confused with a real 0 in any surface. */
export function InsufficientData({ reason, className }: { reason?: RadarUnavailableReason; className?: string }) {
  return <span className={className ?? 'text-xs italic text-ink-400'}>{reasonLabel(reason)}</span>;
}
