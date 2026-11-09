/**
 * Behaviour of the global pill nav (`PillNav.astro`), vanilla with `lib/spring.ts`
 * (decisiones.md 1, hueco-6 §7):
 *
 * - SH-01: the active background slides to the new link on click (before the
 *   navigation), `hashchange`, `popstate` and after a ClientRouter swap.
 * - SH-02: the hover background follows a mouse pointer; it fades in when it comes
 *   from outside the nav (or from the active link) and vanishes on leave.
 * - SH-03: the nav width follows its links (CSS `max-content`, as measured in the reference).
 * - SH-07 / decisiones.md 22: "Email" copies the address and shows a toast.
 * - SH-08: on phones the chrome hides when scrolling down and comes back when
 *   scrolling up; any focus inside it (or in `[data-mobile-chrome]`) shows it at once
 *   and keeps it shown (D-15).
 * - "Trabajos" on the home scrolls smoothly to #works (`auto` with reduced motion).
 *
 * Both backgrounds live inside their link, as the reference does, so they take the
 * press scale with it; while moving they are placed with `left` and `width` projected
 * like motion's `layoutId` (`projectPill`), and once at rest they go back to `inset: 0`
 * and follow the link's size.
 * With reduced motion every spring jumps (spring.ts) and the toast only fades.
 */
import {
  BREAKPOINT_QUERIES,
  CHROME_SPRINGS,
  NAV_HOVER_FADE_MS,
  NAV_TOAST_VISIBLE_MS,
} from '@/components/motion/presets';
import { prefersReducedMotion } from '@/lib/motion-policy';
import {
  activeNavKey,
  ariaCurrentFor,
  EMAIL_FALLBACK_EVENT,
  initialScrollChromeState,
  MOBILE_CHROME,
  MOBILE_CHROME_EVENT,
  MOBILE_CHROME_HOLD_ATTR,
  NAV_SYNC_EVENT,
  projectPill,
  shouldShowAfterDelay,
  stepScrollChrome,
  WORKS_HASH,
  type MobileChromeDetail,
  type NavKey,
} from '@/lib/pill-nav';
import { normalizePath } from '@/lib/i18n-paths';
import { createSpring, type SpringConfig } from '@/lib/spring';

const ROOT_SELECTOR = '[data-pill-nav]';
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

type Teardown = () => void;

const bound = new Map<HTMLElement, Teardown>();

// ------------------------------------------------------------------ sliding backgrounds

interface Pill {
  readonly el: HTMLElement;
  /** Link that holds the pill, `null` when it is not shown. */
  link(): HTMLElement | null;
  /** Moves the pill into `target`, sliding from where it is unless `animate` is false. */
  moveTo(target: HTMLElement, animate: boolean): void;
  detach(): void;
}

/** Sub-pixel layout width (border box), unaffected by the press `scale`; `offsetWidth` rounds. */
const layoutWidth = (el: HTMLElement) => parseFloat(getComputedStyle(el).width) || el.offsetWidth;

function createPill(el: HTMLElement, config: SpringConfig): Pill {
  let holder: HTMLElement | null =
    el.parentElement instanceof HTMLAnchorElement ? el.parentElement : null;
  // The holder's box when the slide started (motion measures the layout once).
  let base = 0;
  let measuredW = 0;

  const moving = () => x.isAnimating() || w.isAnimating();
  const visualBox = () => {
    const box = projectPill({
      x: x.get(),
      w: w.get(),
      base,
      measuredW,
      liveW: holder ? layoutWidth(holder) : measuredW,
    });
    return { left: box.left + base, width: box.width };
  };
  const render = () => {
    if (!holder || !moving()) {
      el.style.removeProperty('left');
      el.style.removeProperty('width');
      el.style.removeProperty('right');
      return;
    }
    const { left, width } = visualBox();
    el.style.left = `${left - base}px`;
    el.style.width = `${width}px`;
    el.style.right = 'auto';
  };
  const x = createSpring(0, config, render);
  const w = createSpring(0, config, render);

  const measure = (link: HTMLElement) => {
    base = link.offsetLeft;
    measuredW = layoutWidth(link);
  };
  const jumpTo = (left: number, width: number) => {
    x.set(left, { jump: true });
    w.set(width, { jump: true });
  };

  if (holder) {
    measure(holder);
    jumpTo(base, measuredW);
  }

  return {
    el,
    link: () => holder,
    moveTo(target, animate) {
      if (holder === target) return;
      const from = holder;
      if (from) {
        if (!moving()) {
          // At rest the pill fills its link: start from the link's live box.
          jumpTo(from.offsetLeft, layoutWidth(from));
        } else {
          // Interrupted: start from what is on screen; the velocity is kept unless the
          // projection had drifted from the spring box (a link that grew meanwhile).
          const box = visualBox();
          if (Math.abs(box.left - x.get()) > 0.5 || Math.abs(box.width - w.get()) > 0.5) {
            jumpTo(box.left, box.width);
          }
        }
      }
      holder = target;
      target.prepend(el);
      measure(target);
      if (!animate || !from) {
        jumpTo(base, measuredW);
        return;
      }
      x.set(base);
      w.set(measuredW);
      render(); // same frame as the move: no flash at the new link's box
    },
    detach() {
      holder = null;
      x.stop();
      w.stop();
      el.remove();
      render();
    },
  };
}

// ------------------------------------------------------------------ clipboard

/** Async clipboard API only (secure contexts); without it the toast tells where to write. */
function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) return Promise.reject(new Error('no clipboard'));
  return navigator.clipboard.writeText(text);
}

// ------------------------------------------------------------------ one nav

function bindPillNav(root: HTMLElement): Teardown {
  const nav = root.querySelector<HTMLElement>('.pill-nav__nav');
  const chrome = root.querySelector<HTMLElement>('.pill-nav__chrome');
  const toast = root.querySelector<HTMLElement>('.pill-nav__toast');
  const toastText = root.querySelector<HTMLElement>('.pill-nav__toast-text');
  const toastIcon = root.querySelector<HTMLElement>('.pill-nav__toast-icon');
  const links = [...root.querySelectorAll<HTMLAnchorElement>('a[data-nav-key]')];
  if (!nav || !chrome || !toast || !toastText || !toastIcon || links.length === 0) {
    return () => {};
  }

  const cleanups: Teardown[] = [];
  const on = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  };
  const linkFor = (key: NavKey | undefined) =>
    links.find((link) => link.dataset.navKey === key) ?? null;

  // ---------------------------------------------------------------- SH-01 active

  const activeEl =
    root.querySelector<HTMLElement>('.pill-nav__active') ??
    Object.assign(document.createElement('span'), { className: 'pill-nav__active' });
  activeEl.setAttribute('aria-hidden', 'true');
  const active = createPill(activeEl, CHROME_SPRINGS.navActive);

  // ---------------------------------------------------------------- SH-02 hover

  const hoverEl = Object.assign(document.createElement('span'), { className: 'pill-nav__hover' });
  hoverEl.setAttribute('aria-hidden', 'true');
  const hover = createPill(hoverEl, CHROME_SPRINGS.navHover);
  const hoverMq = matchMedia(HOVER_QUERY);
  let hovered: HTMLElement | null = null;

  const hideHover = () => {
    hoverEl.getAnimations().forEach((animation) => animation.cancel());
    hover.detach();
  };
  const showHover = (link: HTMLElement) => {
    if (link === active.link()) {
      hideHover();
      return;
    }
    if (hover.link()) {
      hover.moveTo(link, true);
      return;
    }
    // From outside the nav (or from the active link): appears in place.
    hover.moveTo(link, false);
    hoverEl.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: NAV_HOVER_FADE_MS,
      easing: 'ease-out',
    });
  };

  for (const link of links) {
    on(link, 'pointerenter', (event) => {
      if ((event as PointerEvent).pointerType !== 'mouse' || !hoverMq.matches) return;
      hovered = link;
      showHover(link);
    });
  }
  on(nav, 'pointerleave', () => {
    hovered = null;
    hideHover();
  });
  on(hoverMq, 'change', () => {
    if (!hoverMq.matches) {
      hovered = null;
      hideHover();
    }
  });

  const setActive = (key: NavKey | undefined, animate: boolean) => {
    const target = linkFor(key);
    for (const link of links) {
      if (link === target)
        link.setAttribute(
          'aria-current',
          ariaCurrentFor(link.getAttribute('href') ?? '', location.pathname),
        );
      else link.removeAttribute('aria-current');
    }
    if (target) active.moveTo(target, animate);
    else active.detach();
    // The hover background is never drawn on the active link.
    if (target && hover.link() === target) hideHover();
    else if (hovered && hovered !== target && !hover.link()) showHover(hovered);
  };

  const syncActive = (animate: boolean) =>
    setActive(activeNavKey(location.pathname, location.hash), animate);

  // SH-03: the nav is `width: max-content`, so it follows the "Email" padding transition
  // frame by frame, which is what the reference shows (its `layout="size"` spring only runs
  // on React re-renders that change the size, and none does).

  // ---------------------------------------------------------------- SH-07 toast

  let toastTimer = 0;
  const showToast = (text: string, ok: boolean) => {
    window.clearTimeout(toastTimer);
    toastText.textContent = text;
    toastIcon.hidden = !ok;
    if (toast.dataset.state !== 'open') {
      toast.dataset.state = 'hidden';
      void toast.offsetWidth; // commit the start state so the entry transitions
      toast.dataset.state = 'open';
    }
    toastTimer = window.setTimeout(() => {
      toast.dataset.state = 'closing';
    }, NAV_TOAST_VISIBLE_MS);
  };
  on(toast, 'transitionend', (event) => {
    if ((event as TransitionEvent).propertyName !== 'opacity' || toast.dataset.state !== 'closing')
      return;
    toast.dataset.state = 'hidden';
    toastText.textContent = '';
  });
  cleanups.push(() => window.clearTimeout(toastTimer));

  const fillEmail = (template: string | undefined, email: string) =>
    template ? template.replaceAll('{email}', email) : email;
  const copyEmail = (email = root.dataset.email ?? '') => {
    copyText(email)
      .then(() => showToast(fillEmail(root.dataset.toastCopied, email), true))
      .catch(() => showToast(fillEmail(root.dataset.toastFallback, email), false));
  };

  // R-05: another copy action failed; show where to write instead.
  on(window, EMAIL_FALLBACK_EVENT, (event) => {
    const email = (event as CustomEvent<{ email?: string }>).detail?.email || root.dataset.email;
    if (email) showToast(fillEmail(root.dataset.toastFallback, email), false);
  });

  // Decision 22 for every other email link of the page (hero Contact, footer Email): any
  // `a[data-copy-email]` copies and shows this toast. Without the async clipboard the `mailto:`
  // opens as usual, so the fallback message is only for the pill's own link.
  on(document, 'click', (event) => {
    const click = event as MouseEvent;
    if (click.defaultPrevented || click.button !== 0) return;
    if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return;
    const target = click.target instanceof Element ? click.target : null;
    const link = target?.closest<HTMLAnchorElement>('a[data-copy-email]');
    if (!link || root.contains(link) || !navigator.clipboard?.writeText) return;
    event.preventDefault();
    copyEmail(link.dataset.copyEmail);
  });

  // ---------------------------------------------------------------- clicks

  const scrollToWorks = (link: HTMLAnchorElement): boolean => {
    const url = new URL(link.href);
    if (
      url.hash !== WORKS_HASH ||
      normalizePath(url.pathname) !== normalizePath(location.pathname)
    ) {
      return false;
    }
    const target = document.getElementById(WORKS_HASH.slice(1));
    if (!target) return false;
    // The same history entry ClientRouter makes for an in-page hash (it copies the state).
    if (url.href !== location.href) history.pushState(history.state, '', url.href);
    target.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    return true;
  };

  for (const link of links) {
    on(link, 'click', (event) => {
      const click = event as MouseEvent;
      if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey)
        return;
      const key = link.dataset.navKey as NavKey;
      if (key === 'email') {
        event.preventDefault();
        copyEmail();
        return;
      }
      // Marked before navigating, like the reference (SH-01).
      setActive(key, true);
      if (key === 'works' && scrollToWorks(link)) event.preventDefault();
    });
  }

  on(window, 'hashchange', () => syncActive(true));
  on(window, 'popstate', () => syncActive(true));
  on(window, NAV_SYNC_EVENT, () => syncActive(true));
  on(document, 'astro:after-swap', () => syncActive(true));

  // ---------------------------------------------------------------- SH-08 phone chrome

  const phoneMq = matchMedia(BREAKPOINT_QUERIES.phone);
  let scrollState = initialScrollChromeState(window.scrollY);
  let hidden = false;
  let held = false;
  let showTimer = 0;
  let frame = 0;

  const setHidden = (next: boolean) => {
    if (next && held) return;
    if (hidden === next) return;
    hidden = next;
    root.toggleAttribute('data-chrome-hidden', next);
    window.dispatchEvent(
      new CustomEvent<MobileChromeDetail>(MOBILE_CHROME_EVENT, { detail: { hidden: next } }),
    );
  };
  const cancelShow = () => {
    if (showTimer) window.clearTimeout(showTimer);
    showTimer = 0;
  };
  const scheduleShow = () => {
    cancelShow();
    if (!window.visualViewport) {
      setHidden(false);
      return;
    }
    showTimer = window.setTimeout(() => {
      showTimer = 0;
      if (shouldShowAfterDelay(scrollState, window.scrollY)) setHidden(false);
    }, MOBILE_CHROME.showDelayMs);
  };
  const onFrame = () => {
    frame = 0;
    if (!phoneMq.matches) {
      scrollState = initialScrollChromeState(window.scrollY);
      cancelShow();
      setHidden(false);
      return;
    }
    const step = stepScrollChrome(scrollState, window.scrollY);
    scrollState = step.state;
    if (step.action === 'show' || step.action === 'hide') {
      cancelShow();
      setHidden(step.action === 'hide');
    } else if (step.action === 'schedule-show') {
      scheduleShow();
    }
  };

  on(
    window,
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(onFrame);
    },
    { passive: true },
  );
  on(
    window,
    'scrollend',
    () => {
      if (scrollState.direction < 0 && hidden) scheduleShow();
    },
    { passive: true },
  );
  if (window.visualViewport) {
    on(window.visualViewport, 'resize', () => {
      scrollState = { ...scrollState, lastY: Math.max(0, window.scrollY), distance: 0 };
      if (scrollState.direction < 0 && hidden) scheduleShow();
    });
  }
  on(phoneMq, 'change', () => {
    scrollState = initialScrollChromeState(window.scrollY);
    cancelShow();
    if (!phoneMq.matches) setHidden(false);
  });

  // D-15: focus inside the chrome (or a holder such as the back pill) shows it and keeps it.
  const holds = (node: EventTarget | null) =>
    node instanceof Element &&
    (chrome.contains(node) || node.closest(`[${MOBILE_CHROME_HOLD_ATTR}]`) !== null);
  on(document, 'focusin', (event) => {
    if (!holds(event.target)) return;
    held = true;
    cancelShow();
    setHidden(false);
  });
  on(document, 'focusout', (event) => {
    if (holds((event as FocusEvent).relatedTarget)) return;
    held = false;
  });

  cleanups.push(() => {
    if (frame) cancelAnimationFrame(frame);
    cancelShow();
    if (hidden) {
      hidden = false;
      window.dispatchEvent(
        new CustomEvent<MobileChromeDetail>(MOBILE_CHROME_EVENT, { detail: { hidden: false } }),
      );
    }
  });

  // ---------------------------------------------------------------- start

  syncActive(false);
  root.setAttribute('data-hydrated', '');

  return () => cleanups.forEach((cleanup) => cleanup());
}

// ------------------------------------------------------------------ page lifecycle

function bindAll(): void {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    if (!bound.has(root)) bound.set(root, bindPillNav(root));
  }
}

function forgetDetached(): void {
  for (const [root, teardown] of bound) {
    if (root.isConnected) continue;
    teardown();
    bound.delete(root);
  }
}

let started = false;

/** Binds every pill nav now and after each ClientRouter navigation (a persisted nav is kept). */
export function startPillNav(): void {
  if (started) return;
  started = true;
  document.addEventListener('astro:after-swap', forgetDetached);
  document.addEventListener('astro:page-load', bindAll);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  } else {
    bindAll();
  }
}
