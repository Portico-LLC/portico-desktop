import { TOUR_ATTR, getAnchor } from './anchors';

export interface ResolveOptions {
  /** React Router's navigate. Always this, never `window.location` — the desktop shell runs a
   *  HashRouter under an `app://` origin, where a location assignment silently breaks. */
  navigate: (to: string) => void;
  /** Reads the *current* pathname. A function rather than a value because resolution spans
   *  several renders and a captured string would be stale by the time we check it. */
  getPathname: () => string;
  reduce: boolean;
  /** How long to wait for the element after we are on the right route. Generous enough for a
   *  lazy route plus a data fetch, short enough that a genuinely missing anchor does not feel
   *  like a hang. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT = 4000;
/** How long a `navigate` gets to actually change the pathname before we give up. A guard
 *  redirect (ModuleGuard, OwnerOnlyRoute) resolves well inside this. */
const ROUTE_SETTLE_MS = 1200;

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/**
 * The first **visible** match, not simply the first match.
 *
 * This one rule is what makes duplicate ids harmless: the sidebar renders the same nav item
 * component in both its expanded and collapsed branches, and a page can keep an off-screen
 * variant mounted. Taking the first DOM match would sometimes spotlight a zero-size element
 * and leave the coach mark pointing at the top-left corner.
 */
function findVisible(anchorId: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(`[${TOUR_ATTR}="${anchorId}"]`);
  for (const el of matches) if (isVisible(el)) return el;
  return null;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

/** Resolves once the pathname matches, or after `ROUTE_SETTLE_MS`. Returns whether it landed. */
async function waitForRoute(route: string, getPathname: () => string, signal?: AbortSignal): Promise<boolean> {
  const deadline = Date.now() + ROUTE_SETTLE_MS;
  while (Date.now() < deadline) {
    if (signal?.aborted) return false;
    if (getPathname() === route || getPathname().startsWith(`${route}/`)) return true;
    await sleep(60, signal);
  }
  return getPathname() === route;
}

/**
 * Navigates to an anchor's route if needed, then waits for its element to appear.
 *
 * Resolves `null` rather than throwing when the element never shows up — a disabled module, a
 * role that cannot reach the page, an empty-state CTA that is not rendered. Callers degrade
 * (skip the step, or show it as a plain centred card); the tour must never stall on a missing
 * anchor.
 */
export async function resolveAnchor(
  anchorId: string,
  options: ResolveOptions,
): Promise<HTMLElement | null> {
  const { navigate, getPathname, reduce, timeoutMs = DEFAULT_TIMEOUT, signal } = options;
  const anchor = getAnchor(anchorId);
  if (!anchor) {
    if (import.meta.env.DEV) console.warn(`[tour] unknown anchor id "${anchorId}"`);
    return null;
  }

  if (getPathname() !== anchor.route) {
    navigate(anchor.route);
    const landed = await waitForRoute(anchor.route, getPathname, signal);
    // A guard bounced us. Fail fast instead of burning the whole element timeout waiting for
    // something that is definitionally not on this page.
    if (!landed) {
      if (import.meta.env.DEV) {
        console.warn(`[tour] navigation to ${anchor.route} for "${anchorId}" did not land`);
      }
      return null;
    }
  }

  const found = await waitForElement(anchorId, timeoutMs, signal);
  if (!found) return null;

  found.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  // One frame for the scroll to commit, so the first measurement is not of the pre-scroll
  // position — otherwise the spotlight visibly jumps on arrival.
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  return found;
}

/**
 * A `MutationObserver` rather than a poll: lazy routes (Documents and Arcade are code-split)
 * and React Query loading states can delay an element by hundreds of milliseconds, and the
 * observer fires exactly when it lands instead of on the next arbitrary tick.
 */
function waitForElement(
  anchorId: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<HTMLElement | null> {
  const immediate = findVisible(anchorId);
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (el: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const el = findVisible(anchorId);
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const timer = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.warn(`[tour] anchor "${anchorId}" never appeared within ${timeoutMs}ms`);
      }
      finish(null);
    }, timeoutMs);

    signal?.addEventListener('abort', () => finish(null), { once: true });
  });
}

/**
 * Dev-only sanity check, run once when a tour starts.
 *
 * The registry is hand-written and rots quietly when a component is refactored, so this at
 * least catches the case where two elements claim the same id — which would otherwise show up
 * as an intermittently wrong spotlight rather than an error.
 */
export function auditAnchorsInDev(): void {
  if (!import.meta.env.DEV) return;
  const seen = new Map<string, number>();
  document.querySelectorAll(`[${TOUR_ATTR}]`).forEach((el) => {
    const id = el.getAttribute(TOUR_ATTR);
    if (id) seen.set(id, (seen.get(id) ?? 0) + 1);
  });
  for (const [id, count] of seen) {
    // Two is normal and expected — the sidebar renders the same nav item in its expanded and
    // collapsed branches, and only one of them is ever visible.
    if (count > 2) console.warn(`[tour] anchor "${id}" is on ${count} elements`);
  }
}
