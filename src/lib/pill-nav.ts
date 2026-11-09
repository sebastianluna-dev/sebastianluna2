/**
 * Pure logic of the global pill nav (`shell/PillNav.astro` + `pill-nav.client.ts`):
 * which item is active for a location (SH-01) and the phone chrome that hides when
 * scrolling down and comes back when scrolling up (SH-08).
 */
import { normalizePath, splitLocale } from '@/lib/i18n-paths';

export type NavKey = 'home' | 'works' | 'about' | 'email';

/** In-page anchor of the works list on the home. */
export const WORKS_HASH = '#works';

/** Language-neutral path of the About page (fase7-plan §2.4). */
export const ABOUT_PATH = '/about';

/** Language-neutral path of the writings index; its articles live under it. */
export const WRITINGS_PATH = '/writings';

/** Whether a language-neutral path is `base` or below it (`/works`, `/works/x`; not `/worksx`). */
const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`);

/**
 * The item a location marks as current: Trabajos on `/#works` and on any case
 * study, Inicio on the rest of the home, Sobre mí on `/about` and on the writings
 * (index and articles, as the reference does), none elsewhere. Without a hash (SSR)
 * the home marks Inicio, as the reference does before it reads `location.hash`.
 */
export function activeNavKey(pathname: string, hash = ''): NavKey | undefined {
  const { path } = splitLocale(pathname);
  if (path === '/') return hash === WORKS_HASH ? 'works' : 'home';
  if (isUnder(path, '/works')) return 'works';
  if (path === ABOUT_PATH || isUnder(path, WRITINGS_PATH)) return 'about';
  return undefined;
}

export type NavAriaCurrent = 'page' | 'location' | 'true';

/**
 * `aria-current` of the active link: `location` for an in-page target; otherwise `page`
 * when the link is the current page and `true` when it only stands for it (Sobre mí on
 * the writings). Without a pathname a page link is `page`.
 */
export function ariaCurrentFor(href: string, pathname?: string): NavAriaCurrent {
  if (href.includes('#')) return 'location';
  if (pathname === undefined) return 'page';
  const target = normalizePath(href.replace(/[?#].*$/, '') || '/');
  return target === normalizePath(pathname) ? 'page' : 'true';
}

// ------------------------------------------------------------------ SH-01 / SH-02: sliding backgrounds

export interface PillFrame {
  /** Spring values: left and width of the box the pill heads to, in nav coordinates. */
  x: number;
  w: number;
  /** Left of the link that holds the pill, measured when the slide started. */
  base: number;
  /** Width of that link when the slide started. */
  measuredW: number;
  /** Width of that link now (the "Email" padding grows while the pill slides in). */
  liveW: number;
}

/**
 * Box of a sliding pill relative to its link, as motion's `layoutId` projects it:
 * the link is measured once when the slide starts, and the live link box is scaled
 * about its centre and translated so that the measured box lands on the spring box.
 * While the link keeps growing (SH-05), the pill grows with it instead of lagging
 * behind (measured against the reference: within one frame). With a link
 * that does not change it is just the spring box.
 */
export function projectPill({ x, w, base, measuredW, liveW }: PillFrame): {
  left: number;
  width: number;
} {
  const width = measuredW > 0 ? liveW * (w / measuredW) : w;
  const center = x + w / 2 + (liveW - measuredW) / 2;
  return { left: center - width / 2 - base, width };
}

/** SH-08 / CA-05: event on `window` when the phone chrome hides or shows again. */
export const MOBILE_CHROME_EVENT = 'pf:mobile-chrome';

/**
 * A copy of the email failed somewhere else on the page (hero Copy, review R-05): the pill nav shows
 * its "write to <email>" toast, so the address is on screen. `detail.email` is the address.
 */
export const EMAIL_FALLBACK_EVENT = 'pf:email-fallback';

export interface MobileChromeDetail {
  hidden: boolean;
}

/**
 * Elements outside the nav that keep the phone chrome visible while they hold the
 * focus (the case back pill, CA-05): they carry this attribute.
 */
export const MOBILE_CHROME_HOLD_ATTR = 'data-mobile-chrome';

/** Fired on `window` by in-page links that change the URL without `hashchange` (pushState). */
export const NAV_SYNC_EVENT = 'pf:nav-sync';

// ------------------------------------------------------------------ SH-08: phone chrome

/** SH-08, measured in the reference (interacciones.md §2, PPN l.163-232). */
export const MOBILE_CHROME = {
  /** Distance scrolled in one direction before the chrome reacts (px). */
  hideDistancePx: 14,
  /** At or above this scrollY the chrome is always shown (px). */
  topZonePx: 8,
  /** Scroll deltas smaller than this are ignored (px). */
  minDeltaPx: 1,
  /** Debounce before showing it again after scrolling up (ms). */
  showDelayMs: 160,
} as const;

export interface ScrollChromeState {
  /** Last scrollY seen. */
  lastY: number;
  /** Distance accumulated in the current direction. */
  distance: number;
  /** Current direction: 1 down, -1 up, 0 none yet. */
  direction: -1 | 0 | 1;
}

/**
 * - `show`: show now (and cancel a pending show);
 * - `hide`: hide now (and cancel a pending show);
 * - `schedule-show`: (re)start the debounce, then show if still going up or near the top;
 * - `none`: nothing changes.
 */
export type ScrollChromeAction = 'show' | 'hide' | 'schedule-show' | 'none';

export function initialScrollChromeState(scrollY: number): ScrollChromeState {
  return { lastY: Math.max(0, scrollY), distance: 0, direction: 0 };
}

/** One scroll frame. Pure: returns the next state and what the chrome must do. */
export function stepScrollChrome(
  state: ScrollChromeState,
  scrollY: number,
): { state: ScrollChromeState; action: ScrollChromeAction } {
  const y = Math.max(0, scrollY);
  const delta = y - state.lastY;
  if (y <= MOBILE_CHROME.topZonePx) {
    return { state: { lastY: y, distance: 0, direction: 0 }, action: 'show' };
  }
  if (Math.abs(delta) < MOBILE_CHROME.minDeltaPx) {
    return { state: { ...state, lastY: y }, action: 'none' };
  }
  const direction = delta > 0 ? 1 : -1;
  let distance = direction === state.direction ? state.distance : 0;
  distance += Math.abs(delta);
  if (distance >= MOBILE_CHROME.hideDistancePx) {
    return {
      state: { lastY: y, distance: 0, direction },
      action: direction > 0 ? 'hide' : 'schedule-show',
    };
  }
  return { state: { lastY: y, distance, direction }, action: 'none' };
}

/** Whether a pending show may happen when its debounce ends. */
export function shouldShowAfterDelay(state: ScrollChromeState, scrollY: number): boolean {
  return state.direction < 0 || Math.max(0, scrollY) <= MOBILE_CHROME.topZonePx;
}
