import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/lib/types';

export type PresenceState = PresenceStatus | 'focus';

const SIZES = {
  sm: 9,
  md: 11,
  lg: 13,
} as const;

/** The halo/ring color a dot is cut into, as a CSS custom property so it can be overridden
 *  per-container (e.g. a row that changes background on hover) without restructuring this
 *  component again — see the `ringVar` prop. Defaults to the page's own surface. */
const DEFAULT_RING_VAR = '--surface';

/**
 * Availability dot.
 *
 * Redesigned from the original ring-based focus indicator, which drew a 2px border on an
 * 8-12px circle — at that scale the ~4px hole in the middle read as a rendering glitch, not
 * a deliberate icon. Focus is now a solid crescent moon (the standard do-not-disturb glyph),
 * cut with a second circle rather than left hollow, so it's unambiguous at a glance.
 *
 * The separating ring around every state is a `box-shadow`, not a padded wrapper span — that
 * makes it trivial to match a container's actual background (`ringVar`) instead of a
 * hardcoded surface color that goes stale the moment a row's hover state changes.
 */
export function PresenceDot({
  state,
  size = 'md',
  ringVar = DEFAULT_RING_VAR,
  className,
}: {
  state: PresenceState;
  size?: keyof typeof SIZES;
  /** CSS custom property (with the leading `--`) holding the color to cut the ring from.
   *  Pass a container-specific one (e.g. a hover-state token) when the dot sits on a
   *  background that isn't the page's default surface. */
  ringVar?: string;
  className?: string;
}) {
  const px = SIZES[size];
  const ring = `0 0 0 2px var(${ringVar})`;

  if (state === 'focus') {
    // A crescent: a full brass disc with a second, larger disc in the ring color offset
    // toward the upper-right to bite a moon shape out of it — pure CSS, no asset, and it
    // reads correctly at every size this component is used at.
    return (
      <span
        className={cn('relative inline-block flex-shrink-0 rounded-full bg-brass-500', className)}
        style={{ width: px, height: px, boxShadow: ring }}
        title="In focus mode"
      >
        <span
          className="absolute rounded-full"
          style={{
            width: px * 0.78,
            height: px * 0.78,
            top: -px * 0.08,
            right: -px * 0.12,
            background: `var(${ringVar})`,
          }}
        />
      </span>
    );
  }

  const online = state === 'online';
  return (
    <span className={cn('relative inline-flex flex-shrink-0', className)} style={{ width: px, height: px }}>
      {online && (
        <span
          className="absolute inline-flex animate-ping rounded-full bg-moss-500 opacity-60"
          style={{ width: px, height: px }}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          online && 'bg-moss-500',
          state === 'away' && 'bg-ochre-500',
          state === 'offline' && 'bg-ink-300',
        )}
        style={{ width: px, height: px, boxShadow: ring }}
        title={online ? 'Online' : state === 'away' ? 'Away' : 'Offline'}
      />
    </span>
  );
}

/**
 * An avatar with its presence dot anchored to the corner.
 *
 * A wrapper rather than a change to `Avatar`, which is used in dozens of places that have no
 * presence concept and shouldn't grow a prop for it. The dot's ring now reads `ringVar`
 * directly (default `--surface`) instead of a hardcoded `bg-bone-50` patch, so it stays
 * correct if the badge ever sits somewhere other than the default page surface.
 */
export function PresenceBadge({
  state,
  size = 'md',
  ringVar,
  className,
  children,
}: {
  state: PresenceState | null;
  size?: keyof typeof SIZES;
  ringVar?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('relative inline-flex flex-shrink-0', className)}>
      {children}
      {state && (
        <span className="absolute -bottom-0.5 -right-0.5">
          <PresenceDot state={state} size={size} ringVar={ringVar} />
        </span>
      )}
    </span>
  );
}
