/** One fixed color per seat index (0-7) — consistent within a match regardless of who's
 *  sitting there, unlike Avatar.tsx's name-hashed AVATAR_COLORS. Six slots reuse existing
 *  semantic palette steps; the last two use the Arcade-only --seat-rose/--seat-slate tokens
 *  defined in index.css. Confined to the canvas + seat grid, never used for buttons/nav/chips. */
export interface SeatColorClasses {
  bg: string;
  ring: string;
  text: string;
  soft: string;
}

export const SEAT_COLORS: readonly SeatColorClasses[] = [
  { bg: 'bg-pine-600', ring: 'ring-pine-600', text: 'text-pine-600', soft: 'bg-pine-100' },
  { bg: 'bg-brass-600', ring: 'ring-brass-600', text: 'text-brass-600', soft: 'bg-brass-100' },
  { bg: 'bg-terracotta-500', ring: 'ring-terracotta-500', text: 'text-terracotta-500', soft: 'bg-terracotta-100' },
  { bg: 'bg-steel-500', ring: 'ring-steel-500', text: 'text-steel-500', soft: 'bg-steel-100' },
  { bg: 'bg-ochre-500', ring: 'ring-ochre-500', text: 'text-ochre-500', soft: 'bg-ochre-100' },
  { bg: 'bg-moss-500', ring: 'ring-moss-500', text: 'text-moss-500', soft: 'bg-moss-100' },
  { bg: 'bg-[var(--seat-rose)]', ring: 'ring-[var(--seat-rose)]', text: 'text-[var(--seat-rose)]', soft: 'bg-[var(--seat-rose-soft)]' },
  { bg: 'bg-[var(--seat-slate)]', ring: 'ring-[var(--seat-slate)]', text: 'text-[var(--seat-slate)]', soft: 'bg-[var(--seat-slate-soft)]' },
];

export function seatColor(seatIndex: number | null | undefined): SeatColorClasses {
  const i = seatIndex ?? 0;
  return SEAT_COLORS[i % SEAT_COLORS.length];
}

/** Same eight slots, as CSS custom-property names — for canvas drawing, where fillStyle
 *  needs an actual resolved color string, not a Tailwind class. Canvas contexts don't
 *  reliably resolve `var(--x)` in fillStyle across browsers, so callers must resolve these
 *  via getComputedStyle (see resolveSeatColorsHex below) rather than passing the name raw. */
export const SEAT_COLOR_VARS: readonly string[] = [
  '--pine-600',
  '--brass-600',
  '--terracotta-500',
  '--steel-500',
  '--ochre-500',
  '--moss-500',
  '--seat-rose',
  '--seat-slate',
];

/** Resolves all eight seat colors to real color strings in one pass (cheap — 8
 *  getPropertyValue calls) — call once per animation frame so canvas drawing always reflects
 *  the current light/dark theme, including a live toggle mid-match. */
export function resolveSeatColorsHex(): string[] {
  if (typeof window === 'undefined') return SEAT_COLOR_VARS.map(() => '#888888');
  const styles = getComputedStyle(document.documentElement);
  return SEAT_COLOR_VARS.map((name) => styles.getPropertyValue(name).trim() || '#888888');
}
