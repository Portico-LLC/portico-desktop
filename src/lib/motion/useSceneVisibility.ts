import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * Gate for the landing page's looping product scenes.
 *
 * A scene should only burn frames while it is actually on screen and the tab is
 * focused. Every loop in `components/landing/scenes/` is written as
 * `animate={play ? keyframes : false}` so that when `play` flips false the
 * element simply holds its current frame at zero cost — no timers, no RAF.
 *
 * `play` is false when any of these hold:
 *  - the scene is outside the viewport (plus a 200px lead-in so it is already
 *    running by the time it scrolls into view),
 *  - the tab is hidden,
 *  - the user prefers reduced motion. The global `prefers-reduced-motion` CSS
 *    block in `index.css` only zeroes out *CSS* animations, so framer-motion's
 *    JS-driven values have to be gated here explicitly.
 */
export function useSceneVisibility<T extends Element = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const reduce = !!useReducedMotion();
  const inView = useInView(ref, { margin: '200px' });
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return { ref, reduce, play: inView && tabVisible && !reduce };
}
