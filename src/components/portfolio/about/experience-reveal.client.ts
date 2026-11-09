/**
 * Reversible reveal of the /about Experience texts (about-spec §4.3, `ABOUT_EXPERIENCE_REVEAL`).
 *
 * - Each `[data-reveal]` element has its own IntersectionObserver entry: it enters when at least
 *   `threshold` of it is in view and leaves below it, every time (`once: false`), with its slot's
 *   tween and delay both ways (WAAPI; the end state is CSS through `data-reveal-state`).
 * - A change mid-flight starts from the values on screen, so a quick scroll never jumps.
 * - Reduced motion, the no-JS render or the no-JS rescue: nothing is bound and the CSS final state
 *   shows; a switch to reduced motion reveals everything at once.
 * - Rebinds on `astro:page-load` and releases on `astro:before-swap`.
 */
import { ABOUT_EXPERIENCE_REVEAL, APPEAR_PRESETS } from '@/components/motion/presets';
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import { scriptsActive } from '@/lib/scripts-ready';
import {
  revealFrame,
  revealState,
  revealThresholds,
  type RevealFrame,
  type RevealState,
} from '@/lib/in-view-reveal';

const SELECTOR = '.experience-list [data-reveal]';
type SlotName = keyof typeof ABOUT_EXPERIENCE_REVEAL.slots;

const running = new Map<HTMLElement, Animation>();
let observer: IntersectionObserver | undefined;
let stopWatching: (() => void) | undefined;
let started = false;

function slotOf(el: HTMLElement) {
  const name = el.dataset.reveal as SlotName;
  return Object.hasOwn(ABOUT_EXPERIENCE_REVEAL.slots, name)
    ? ABOUT_EXPERIENCE_REVEAL.slots[name]
    : undefined;
}

function setState(el: HTMLElement, next: RevealState) {
  const current = el.dataset.revealState ?? 'out';
  if (current === next) return;
  const slot = slotOf(el);
  if (!slot) {
    el.dataset.revealState = 'in';
    return;
  }
  const preset = APPEAR_PRESETS[slot.preset];
  // What is on screen now (an animation in flight included), before the CSS target changes.
  const style = getComputedStyle(el);
  const from: RevealFrame = {
    opacity: Number.parseFloat(style.opacity),
    translate: style.translate === 'none' ? '0px 0px' : style.translate,
  };
  running.get(el)?.cancel();
  el.dataset.revealState = next;
  const keyframes: Keyframe[] = [from, revealFrame(preset, next)];
  const animation = el.animate(keyframes, {
    duration: preset.timing.durationMs,
    delay: slot.delay * 1000,
    easing: preset.timing.easing,
    // The start values hold during the delay; the CSS of the new state takes over at the end.
    fill: 'backwards',
  });
  running.set(el, animation);
  animation.onfinish = () => {
    if (running.get(el) === animation) running.delete(el);
  };
}

function onIntersect(entries: IntersectionObserverEntry[]) {
  const reduced = prefersReducedMotion();
  for (const entry of entries) {
    setState(
      entry.target as HTMLElement,
      revealState(entry, ABOUT_EXPERIENCE_REVEAL.threshold, reduced),
    );
  }
}

function revealAll() {
  for (const [, animation] of running) animation.cancel();
  running.clear();
  for (const el of document.querySelectorAll<HTMLElement>(SELECTOR)) el.dataset.revealState = 'in';
}

function bind() {
  release();
  const elements = document.querySelectorAll<HTMLElement>(SELECTOR);
  if (!elements.length || !scriptsActive()) return;
  if (prefersReducedMotion()) {
    revealAll();
  } else {
    observer = new IntersectionObserver(onIntersect, {
      threshold: revealThresholds(ABOUT_EXPERIENCE_REVEAL.threshold),
    });
    for (const el of elements) observer.observe(el);
  }
  stopWatching = watchReducedMotion((reduced) => {
    if (!reduced) return;
    observer?.disconnect();
    observer = undefined;
    revealAll();
  });
}

function release() {
  observer?.disconnect();
  observer = undefined;
  stopWatching?.();
  stopWatching = undefined;
  for (const animation of running.values()) animation.cancel();
  running.clear();
}

/** Installs the Experience reveal once per document. */
export function startExperienceReveal(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  document.addEventListener('astro:page-load', bind);
  document.addEventListener('astro:before-swap', release);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
}
