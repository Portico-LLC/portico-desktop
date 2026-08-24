import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePanelPrefsStore } from '@/store/panelPrefs';

/**
 * Root shell for the floating panel window. The Electron BrowserWindow itself is
 * frame:false + transparent:true — this div is what actually draws the rounded
 * shape and the translucent-to-opaque surface, via CSS. The panel window has no
 * OS chrome, so html/body must be made transparent too, otherwise the browser's
 * own opaque background would paint a square behind our rounded corners.
 */
// CSS blur applied on top of (and independent from) the native OS backdrop
// material — the actual cross-platform glassmorphism layer, since it's the
// only one of the two that's guaranteed to render everywhere (Linux, older
// Windows, or wherever native vibrancy/acrylic silently fails to apply).
const BACKDROP_FILTER: Record<string, string> = {
  off: 'none',
  frosted: 'blur(12px) saturate(150%)',
  heavy: 'blur(24px) saturate(160%)',
};

// Three layers instead of one flat drop-shadow: the existing soft ambient
// shadow, a tighter contact shadow underneath it (reusing --shadow-md's own
// first component rather than inventing a new shadow color), and a 1px inset
// highlight along the top edge using the same --surface + color-mix idiom as
// the background above — reads as a lit glass edge rather than a flat card.
// box-shadow (inset included) auto-clips to border-radius, so this stays
// correct at any user-chosen corner radius with no extra math.
const PANEL_SHADOW = [
  'var(--shadow-lg)',
  '0 4px 12px rgb(28 27 23 / 0.08)',
  'inset 0 1px 0 0 color-mix(in srgb, var(--surface) 70%, transparent)',
].join(', ');

export function PanelFrame({ children }: { children: ReactNode }) {
  const prefs = usePanelPrefsStore((s) => s.prefs);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, []);

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden border border-ink-200"
      style={{
        borderRadius: `${prefs.cornerRadius}px`,
        backgroundColor: `color-mix(in srgb, var(--surface) ${prefs.opacity}%, transparent)`,
        backdropFilter: BACKDROP_FILTER[prefs.blurMode] ?? 'none',
        WebkitBackdropFilter: BACKDROP_FILTER[prefs.blurMode] ?? 'none',
        boxShadow: PANEL_SHADOW,
      }}
    >
      {children}
    </div>
  );
}
