/**
 * Windows and Apple marks as inline paths.
 *
 * lucide-react carries no brand logos, and pulling in a brand-icon package for
 * two glyphs isn't worth the dependency. Both are drawn on a 24×24 grid and
 * inherit `currentColor` so they sit inside the switch like any lucide icon.
 */

interface MarkProps {
  size?: number;
  className?: string;
}

/**
 * The four-pane tile. Drawn with the slight perspective skew of the modern
 * (Windows 11) mark rather than the flat squares — the top edge of each pane
 * rises toward the outside, which is what stops it reading as a generic grid
 * icon.
 */
export function WindowsMark({ size = 16, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M3 5.4 11.1 4.3v7.3H3V5.4Z" />
      <path d="M12.3 4.1 21 3v8.6h-8.7V4.1Z" />
      <path d="M3 12.8h8.1v7.3L3 19V12.8Z" />
      <path d="M12.3 12.8H21V21l-8.7-1.1v-7.1Z" />
    </svg>
  );
}

/** The Apple silhouette — leaf, notch, and the split base. */
export function AppleMark({ size = 16, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path d="M16.7 12.6c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.1-1.5 2.6-.4 6.5 1.1 8.7.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7 1.9-1 2.6-2a9 9 0 0 0 1.2-2.4c-.1 0-2.2-.9-2.2-3.5Z" />
      <path d="M14.5 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-1 2.6 1 .1 2-.5 2.7-1.2Z" />
    </svg>
  );
}
