/**
 * Behaviour of the Works Map (`WorksMap.astro`), vanilla:
 *
 * - CA-02: scroll-spy. On `scroll` and `resize` (one rAF per frame) the current section is the last
 *   `[data-case-section]` whose top is above `WORKS_MAP.activeLine` of the viewport, else the first
 *   (`currentSectionId`); its link gets `aria-current="location"` and the CSS eases the opacity. The
 *   map is `display: none` below 1200, so nothing is measured there until the breakpoint matches.
 * - CA-03: a plain click (or Enter) is left to the router, which jumps natively and instantly to the
 *   anchor (`scroll-margin-top`); one frame later, once the fragment navigation has run its focus
 *   steps, the focus moves to the h2 of the section (`tabindex=-1`, `preventScroll`).
 *
 * A case page renders a new map on every navigation: each one is bound on `astro:page-load` and its
 * listeners and pending frames are removed once it leaves the document.
 */
import { BREAKPOINT_QUERIES } from '@/components/motion/presets';
import { isPlainClick } from '@/lib/case-nav';
import { currentSectionId, inPageTarget } from '@/lib/works-map';

const ROOT_SELECTOR = '[data-works-map]';
const LINK_SELECTOR = 'a[data-works-map-link]';
const SECTION_SELECTOR = '[data-case-section]';
const CURRENT = 'location';

type Teardown = () => void;

const bound = new Map<HTMLElement, Teardown>();

/** The heading that names a section (`aria-labelledby`), or its first h2. */
function headingOf(section: HTMLElement): HTMLElement | null {
  const labelledBy = section.getAttribute('aria-labelledby');
  const labelled = labelledBy ? document.getElementById(labelledBy) : null;
  return labelled ?? section.querySelector<HTMLElement>('h2');
}

function bindWorksMap(root: HTMLElement): Teardown {
  const links = [...root.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)];
  if (links.length === 0) return () => {};

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

  // ---------------------------------------------------------------- CA-02 spy

  const desktop = matchMedia(BREAKPOINT_QUERIES.desktop);
  let frame = 0;

  const mark = (id: string) => {
    for (const link of links) {
      if (link.dataset.worksMapLink === id) link.setAttribute('aria-current', CURRENT);
      else link.removeAttribute('aria-current');
    }
  };

  const update = () => {
    frame = 0;
    if (!desktop.matches) return;
    const sections = [...document.querySelectorAll<HTMLElement>(SECTION_SELECTOR)].map(
      (section) => ({
        id: section.dataset.caseSection ?? section.id,
        top: section.getBoundingClientRect().top,
      }),
    );
    const id = currentSectionId(sections, window.innerHeight);
    if (id) mark(id);
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  on(window, 'scroll', schedule, { passive: true });
  on(window, 'resize', schedule, { passive: true });
  on(desktop, 'change', schedule);
  cleanups.push(() => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  });

  // ---------------------------------------------------------------- CA-03 jump + focus

  let focusFrame = 0;
  for (const link of links) {
    on(link, 'click', (event) => {
      if (event.defaultPrevented || !isPlainClick(event as MouseEvent)) return;
      const id = inPageTarget(link.href, location.href);
      const section = id ? document.getElementById(id) : null;
      const heading = section ? headingOf(section) : null;
      if (!heading) return;
      if (focusFrame) cancelAnimationFrame(focusFrame);
      // After the router's (synchronous) fragment navigation, which focuses the viewport.
      focusFrame = requestAnimationFrame(() => {
        focusFrame = 0;
        if (heading.isConnected) heading.focus({ preventScroll: true });
        schedule();
      });
    });
  }
  cleanups.push(() => {
    if (focusFrame) cancelAnimationFrame(focusFrame);
    focusFrame = 0;
  });

  update();

  return () => cleanups.forEach((cleanup) => cleanup());
}

// ------------------------------------------------------------------ page lifecycle

function bindAll(): void {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    if (!bound.has(root)) bound.set(root, bindWorksMap(root));
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

/** Binds the Works Map of the page now and after each ClientRouter navigation. */
export function startWorksMap(): void {
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
