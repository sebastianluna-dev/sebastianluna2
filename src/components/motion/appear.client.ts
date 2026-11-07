/**
 * Binds `[data-appear]` elements to the page engine (animation-inventory.md §4, CA-01, HO-01, RT-13).
 *
 * - One IntersectionObserver, `threshold: 0`, no rootMargin; an element plays once (WeakSet) and its
 *   `data-appear-delay` (seconds) counts from its own intersection, also below the fold.
 * - The pre-animation state is CSS under `html.js` (AppearMotion.astro), never inline.
 * - `focusin` on an element, or inside it, ends its appear at once (also a pending one).
 * - Reduced motion: every appear fades its opacity in 150 ms right away; nothing waits hidden.
 * - Starts once the DOM is parsed and rebinds on `astro:page-load`, which `<ClientRouter/>` fires after
 *   it has restored the scroll, so the observer never sees the top of the page before the jump.
 *   Retained nodes (`transition:persist`) never replay.
 * - Marks <html> `pf-ready` (cancels the no-JS rescue of theme.inline.ts). If the rescue already fired
 *   (modules later than `RESCUE_MS`), the page stays in its no-JS render: nothing is bound or hidden.
 */
import { prefersReducedMotion, resolveDelayMs } from '@/lib/motion-policy';
import { markScriptsReady, scriptsActive } from '@/lib/scripts-ready';
import { engine } from './engine';
import {
  APPEAR_STAGGER,
  BREAKPOINT_QUERIES,
  isAppearPresetName,
  type AppearPresetName,
  type AppearSlot,
} from './presets';
import type { AppearHandle, Breakpoint, StaggerMode } from './types';

const SELECTOR = '[data-appear]';
const STAGGER_SELECTOR = '[data-appear-stagger]';

type AppearState = 'running' | 'done';

/** Started at least once: never replays (also across ClientRouter navigations). */
const played = new WeakSet<HTMLElement>();
/** Currently observed. */
const observed = new Set<HTMLElement>();
const running = new Map<HTMLElement, AppearHandle>();
/** First intersecting delay (s) of each `section` stagger group. */
const groupStart = new WeakMap<Element, number>();

let observer: IntersectionObserver | undefined;
let started = false;

function currentBreakpoint(): Breakpoint {
  for (const bp of ['phone', 'tablet', 'desktop'] as const) {
    if (matchMedia(BREAKPOINT_QUERIES[bp]).matches) return bp;
  }
  return 'desktop';
}

function setState(el: HTMLElement, state: AppearState) {
  el.dataset.appearState = state;
}

function readDelay(el: HTMLElement): number {
  const value = Number.parseFloat(el.dataset.appearDelay ?? '');
  return Number.isFinite(value) ? value : 0;
}

function delayFor(el: HTMLElement, delayS: number): number {
  const group = el.closest<HTMLElement>(STAGGER_SELECTOR);
  const mode: StaggerMode = group?.dataset.appearStagger === 'section' ? 'section' : APPEAR_STAGGER;
  if (mode !== 'section' || !group) return resolveDelayMs(delayS, mode);
  if (!groupStart.has(group)) groupStart.set(group, delayS);
  return resolveDelayMs(delayS, mode, groupStart.get(group));
}

function unobserve(el: HTMLElement) {
  observer?.unobserve(el);
  observed.delete(el);
}

/** Starts the appear of `el` now (its delay still applies unless `reduced`). */
function start(
  el: HTMLElement,
  preset: AppearPresetName,
  delayS: number,
): AppearHandle | undefined {
  if (played.has(el)) return running.get(el);
  played.add(el);
  unobserve(el);
  const reducedMotion = prefersReducedMotion();
  setState(el, 'running');
  const handle = engine.appear(el, preset, currentBreakpoint(), {
    delayMs: reducedMotion ? 0 : delayFor(el, delayS),
    reducedMotion,
  });
  running.set(el, handle);
  handle.finished.then(() => {
    running.delete(el);
    setState(el, 'done');
  });
  return handle;
}

function startFromDataset(el: HTMLElement): AppearHandle | undefined {
  const name = el.dataset.appear ?? '';
  if (!isAppearPresetName(name)) {
    // Unknown preset: show the element instead of leaving it hidden.
    played.add(el);
    unobserve(el);
    setState(el, 'done');
    return undefined;
  }
  return start(el, name, readDelay(el));
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const el = entry.target as HTMLElement;
    // `getClientRects()` skips boxes that are not rendered (the reference guards the same way).
    if (entry.isIntersecting && el.getClientRects().length) startFromDataset(el);
  }
}

/** Observes one element (islands call it from `useAppear`). Idempotent. */
export function bindAppearElement(el: HTMLElement): void {
  if (played.has(el) || observed.has(el) || !scriptsActive()) return;
  if (prefersReducedMotion()) {
    startFromDataset(el);
    return;
  }
  observer ??= new IntersectionObserver(onIntersect, { threshold: 0 });
  observed.add(el);
  observer.observe(el);
}

/** Observes every `[data-appear]` under `root`. */
export function bindAppear(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>(SELECTOR)) bindAppearElement(el);
}

/** Plays a slot on mount, without waiting for the observer (BL-01). */
export function playAppear(el: HTMLElement, slot: AppearSlot): AppearHandle | undefined {
  return start(el, slot.preset, slot.delay);
}

/** Ends the appear of `el` now, whether it is running, waiting for its delay or not yet in view. */
export function finishAppear(el: HTMLElement): void {
  if (el.dataset.appearState === 'done') return;
  const handle = running.get(el) ?? startFromDataset(el);
  handle?.finish();
}

function onFocusIn(event: FocusEvent) {
  let node = event.target instanceof Element ? event.target.closest<HTMLElement>(SELECTOR) : null;
  while (node) {
    finishAppear(node);
    node = node.parentElement?.closest<HTMLElement>(SELECTOR) ?? null;
  }
}

/** Drops the nodes the router removed (cancels their animations, stops observing them). */
function forgetDetached() {
  for (const el of observed) if (!el.isConnected) unobserve(el);
  for (const [el, handle] of running) if (!el.isConnected) handle.cancel();
}

/** Installs the engine once per document. Safe to call from several scripts. */
export function startAppearEngine(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  markScriptsReady();
  // The router copies the new document's <html> attributes, so the mark goes again on every swap.
  document.addEventListener('astro:after-swap', () => markScriptsReady());
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('astro:after-swap', forgetDetached);
  document.addEventListener('astro:page-load', () => bindAppear());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bindAppear(), { once: true });
  } else {
    bindAppear();
  }
}
