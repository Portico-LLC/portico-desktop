import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/lib/types';

export type PresenceState = PresenceStatus | 'focus';

const SIZES = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
} as const;

/**
 * Availability dot. Promoted from the arcade page, which defined it and then never imported
 * it, and extended with a focus state.
 *
 * Focus reads as brass rather than the usual red "do not disturb": in this design system
 * brass is the signal colour, and red is reserved for genuine error states. It is also drawn
 * as a ring rather than a fill so it is distinguishable from "online" without relying on
 * colour alone.
 *
 * Per DESIGN.md: a small filled circle, and the pulse only for live states — never a
 * decorative animation on an idle one.
 */
export function PresenceDot({
  state,
  size = 'md',
  className,
}: {
  state: PresenceState;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const dimension = SIZES[size];

  if (state === 'focus') {
    return (
      <span
        className={cn('relative inline-flex flex-shrink-0 items-center justify-center', dimension, className)}
        title="In focus mode"
      >
        <span className={cn('rounded-full border-2 border-brass-500 bg-bone-50', dimension)} />
      </span>
    );
  }

  const online = state === 'online';
  return (
    <span
      className={cn('relative inline-flex flex-shrink-0', dimension, className)}
      title={online ? 'Online' : state === 'away' ? 'Away' : 'Offline'}
    >
      {online && (
        <span className={cn('absolute inline-flex animate-ping rounded-full bg-moss-500 opacity-60', dimension)} />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          dimension,
          online && 'bg-moss-500',
          state === 'away' && 'bg-ochre-500',
          state === 'offline' && 'bg-ink-300',
        )}
      />
    </span>
  );
}

/**
 * An avatar with its presence dot anchored to the corner.
 *
 * A wrapper rather than a change to `Avatar`, which is used in dozens of places that have no
 * presence concept and shouldn't grow a prop for it.
 */
export function PresenceBadge({
  state,
  size = 'md',
  className,
  children,
}: {
  state: PresenceState | null;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('relative inline-flex flex-shrink-0', className)}>
      {children}
      {state && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-bone-50 p-[1.5px]">
          <PresenceDot state={state} size={size} />
        </span>
      )}
    </span>
  );
}
