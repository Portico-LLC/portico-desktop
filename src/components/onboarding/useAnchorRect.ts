import { useEffect, useState } from 'react';

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function read(el: HTMLElement): AnchorRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * Keeps a live rect for the spotlighted element.
 *
 * The tour paints over a working application, so the target moves for reasons that have nothing
 * to do with the tour: the user collapses the sidebar (a 240px-to-64px spring), resizes the
 * window, or scrolls the page underneath. Re-measuring on all three is what keeps the spotlight
 * glued to the thing it is pointing at instead of drifting off it.
 *
 * `scroll` is captured, because the element usually sits inside an internal scroll container
 * (`Layout` scrolls its content area, not the document) and a bubbling listener would never
 * hear it.
 *
 * Returns `null` once the element goes zero-size — a collapsed section, an unmounted page — so
 * the caller can degrade rather than draw a hole around nothing.
 */
export function useAnchorRect(el: HTMLElement | null): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(() => (el ? read(el) : null));

  useEffect(() => {
    if (!el) {
      setRect(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      // Coalesced into a frame: a sidebar collapse fires ResizeObserver and scroll together,
      // and measuring twice per frame is a layout thrash for no visual gain.
      frame = requestAnimationFrame(() => {
        const next = read(el);
        setRect(next.width > 0 && next.height > 0 ? next : null);
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    // The sidebar animates its own width, so watching only the target misses the reflow that
    // pushes it sideways.
    resizeObserver.observe(document.body);

    window.addEventListener('scroll', measure, { capture: true, passive: true });
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', measure, { capture: true });
      window.removeEventListener('resize', measure);
    };
  }, [el]);

  return rect;
}
