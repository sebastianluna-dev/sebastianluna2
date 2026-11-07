/**
 * Theme cord behaviour (TE-01…TE-05; interacciones.md §5, estados.md §5, decisions 17, 23, 29).
 *
 * - Drag with pointer capture: rubber-banded (x, y) from `lib/theme-cord.ts`; crossing 18 px switches
 *   the theme once per gesture. Release springs back with the pointer's velocity (TE-04).
 * - Tap (≤ 6 px), Enter/Space and assistive-technology clicks switch and tug the cord (TE-05).
 * - Mouse hover drops the handle 4 px (TE-02). Escape cancels a drag.
 * - Touch: a first move upwards of more than 6 px yields to the page scroll, done by hand
 *   because `touch-action: none` cannot hand the gesture back (decision 17).
 * - The switch is instant: `data-theme` on <html> under `.pf-theme-switching` for 2 frames, the
 *   choice stored in `pf-theme` and a `themeChange` event for islands and demos (TE-01).
 * - With reduced motion every spring jumps to its target and the hover drop is skipped.
 */
import { BREAKPOINT_QUERIES, CHROME_SPRINGS, ROPE_TUG_MS } from '@/components/motion/presets';
import { prefersReducedMotion } from '@/lib/motion-policy';
import {
  createSpring,
  createVelocityTracker,
  tween,
  type Spring,
  type SpringConfig,
} from '@/lib/spring';
import { cubicBezier } from '@/lib/spring-to-linear';
import {
  CORD,
  CORD_TUG_EASE,
  cordAngle,
  cordPath,
  cordX,
  cordY,
  crossesThreshold,
  flingDone,
  flingOffset,
  releaseOutcome,
  touchIntent,
  tugTarget,
  type TouchIntent,
} from '@/lib/theme-cord';
import { THEME_STORAGE_KEY, type ThemeName } from './theme.inline';

export const THEME_CHANGE_EVENT = 'themeChange';
const SWITCHING_CLASS = 'pf-theme-switching';
const tugEase = cubicBezier(CORD_TUG_EASE);

/** One animated coordinate of the handle: direct sets while dragging, springs and tweens after. */
interface Channel {
  get(): number;
  /** Follows the pointer: stops any animation and records the velocity. */
  set(value: number): void;
  springTo(target: number, config: SpringConfig): void;
  /** Resolves `true` when the tween ends, `false` when something else took over. */
  tweenTo(target: number, durationMs: number): Promise<boolean>;
  stop(): void;
}

function createChannel(onChange: () => void): Channel {
  let value = 0;
  let spring: Spring | null = null;
  let running: { cancel(): void } | null = null;
  const tracker = createVelocityTracker();

  const write = (next: number) => {
    value = next;
    tracker.push(next);
    onChange();
  };
  const velocity = () => (spring?.isAnimating() ? spring.velocity() : tracker.get());
  const stop = () => {
    spring?.stop();
    spring = null;
    running?.cancel();
    running = null;
  };

  return {
    get: () => value,
    set(next) {
      stop();
      write(next);
    },
    springTo(target, config) {
      const initialVelocity = velocity();
      stop();
      spring = createSpring(value, config, write);
      spring.set(target, { velocity: initialVelocity });
    },
    tweenTo(target, durationMs) {
      stop();
      let completed = true;
      const run = tween(value, target, durationMs, tugEase, write);
      running = {
        cancel() {
          completed = false;
          run.cancel();
        },
      };
      return run.finished.then(() => {
        if (completed) running = null;
        return completed;
      });
    },
    stop,
  };
}

interface Drag {
  id: number;
  pointerType: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  fired: boolean;
  intent: TouchIntent;
  lastY: number;
}

const bound = new WeakSet<HTMLElement>();

function readTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** Applies a theme instantly (TE-01) and optionally stores it as the visitor's choice. */
export function applyTheme(next: ThemeName, persist = true) {
  const html = document.documentElement;
  html.classList.add(SWITCHING_CLASS);
  html.dataset.theme = next;
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  }
  // Flush the new styles while transitions are off, then let them back on after two frames.
  void html.offsetHeight;
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove(SWITCHING_CLASS)));
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: next } }));
}

function bindThemeToggle(root: HTMLElement) {
  if (bound.has(root)) return;
  const button = root.querySelector<HTMLButtonElement>('.pf-theme-toggle__switch');
  const path = root.querySelector<SVGPathElement>('.pf-theme-toggle__path');
  if (!button || !path) return;
  bound.add(root);

  let length: number = CORD.length;
  const readLength = () => {
    const value = parseFloat(getComputedStyle(root).getPropertyValue('--pf-theme-toggle-length'));
    length = Number.isFinite(value) ? value : CORD.length;
  };

  // Writes only (no layout reads), so it runs straight from every pointer event and spring frame.
  const render = () => {
    const px = x.get();
    const py = y.get();
    button.style.transform =
      px === 0 && py === 0
        ? ''
        : `translate(${px}px, ${py}px) rotate(${cordAngle(px, py, length)}deg)`;
    path.setAttribute('d', cordPath(px, py, length));
  };
  const x = createChannel(render);
  const y = createChannel(render);

  const syncChecked = () => button.setAttribute('aria-checked', String(readTheme() === 'dark'));

  const toggle = () => {
    applyTheme(readTheme() === 'dark' ? 'light' : 'dark');
    syncChecked();
    navigator.vibrate?.(CORD.hapticMs);
  };

  /** TE-04: back to rest with the current velocity. */
  const release = () => {
    if (prefersReducedMotion()) {
      x.set(0);
      y.set(0);
      return;
    }
    x.springTo(0, CHROME_SPRINGS.ropeX);
    y.springTo(0, CHROME_SPRINGS.ropeY);
  };

  /** TE-05: 140 ms easeOut tug to 30 px, then the release spring. */
  const tug = () => {
    if (prefersReducedMotion()) {
      x.set(0);
      y.set(0);
      return;
    }
    x.stop();
    void y.tweenTo(tugTarget(), ROPE_TUG_MS).then((completed) => {
      if (completed && !drag) release();
    });
  };

  let drag: Drag | null = null;
  let fling = 0;
  const scrollTracker = createVelocityTracker();

  const stopFling = () => {
    if (fling) cancelAnimationFrame(fling);
    fling = 0;
  };

  /** Decision 17: inertial page scroll after a yielded touch gesture. */
  const startFling = (velocity: number) => {
    stopFling();
    if (prefersReducedMotion() || flingDone(velocity, 0)) return;
    const start = performance.now();
    let travelled = 0;
    const step = (time: number) => {
      const elapsed = time - start;
      const offset = flingOffset(velocity, elapsed);
      window.scrollBy(0, offset - travelled);
      travelled = offset;
      fling = flingDone(velocity, elapsed) ? 0 : requestAnimationFrame(step);
    };
    fling = requestAnimationFrame(step);
  };

  const endDrag = (event: PointerEvent, cancelled: boolean) => {
    const state = drag;
    if (!state || state.id !== event.pointerId) return;
    drag = null;
    root.removeAttribute('data-dragging');
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);

    if (state.intent === 'scroll') {
      if (!cancelled) startFling(scrollTracker.get());
      return;
    }
    if (!cancelled && !state.fired) {
      const outcome = releaseOutcome(
        state.originY,
        event.clientX - state.startX,
        event.clientY - state.startY,
      );
      if (outcome === 'pull') {
        state.fired = true;
        toggle();
      } else if (outcome === 'tap') {
        state.fired = true;
        // Tug first: the theme swap restyles the whole page and must not delay its first frame (F5).
        tug();
        toggle();
        return;
      }
    }
    release();
  };

  button.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    event.preventDefault();
    stopFling();
    x.stop();
    y.stop();
    drag = {
      id: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      originX: x.get(),
      originY: y.get(),
      fired: false,
      intent: event.pointerType === 'touch' ? 'pending' : 'pull',
      lastY: event.clientY,
    };
    button.setPointerCapture(event.pointerId);
    root.setAttribute('data-dragging', '');
  });

  button.addEventListener('pointermove', (event) => {
    const state = drag;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (state.intent === 'pending') {
      state.intent = touchIntent(dx, dy);
      if (state.intent === 'scroll') {
        scrollTracker.reset();
        release();
      }
    }
    if (state.intent === 'scroll') {
      window.scrollBy(0, state.lastY - event.clientY);
      state.lastY = event.clientY;
      scrollTracker.push(-event.clientY);
      return;
    }
    state.lastY = event.clientY;

    const pull = Math.max(0, state.originY + dy);
    x.set(cordX(state.originX + dx));
    y.set(cordY(pull));
    if (!state.fired && crossesThreshold(pull)) {
      state.fired = true;
      toggle();
    }
  });

  button.addEventListener('pointerup', (event) => endDrag(event, false));
  button.addEventListener('pointercancel', (event) => endDrag(event, true));
  button.addEventListener('lostpointercapture', (event) => endDrag(event, true));

  // TE-02: mouse only; a finger never hovers.
  button.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || drag || prefersReducedMotion()) return;
    x.stop();
    y.springTo(CORD.hoverDrop, CHROME_SPRINGS.ropeHover);
  });
  button.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse' || drag || prefersReducedMotion()) return;
    release();
  });

  // Decision 23: Enter and Space switch and tug, without auto-repeat. Escape cancels a drag.
  let keyActivation = false;
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drag) {
      const state = drag;
      drag = null;
      root.removeAttribute('data-dragging');
      if (button.hasPointerCapture(state.id)) button.releasePointerCapture(state.id);
      release();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && !drag) {
      event.preventDefault();
      keyActivation = true;
      if (event.repeat) return;
      tug();
      toggle();
    }
  });
  // The click a key press synthesises arrives right after keyup; drop it, then listen again.
  const endKeyActivation = () => setTimeout(() => (keyActivation = false));
  button.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || event.key === ' ') endKeyActivation();
  });
  button.addEventListener('blur', endKeyActivation);
  // Pointer clicks are handled by the gesture; this catches assistive technology (detail 0).
  button.addEventListener('click', (event) => {
    if (event.detail !== 0 || keyActivation) return;
    tug();
    toggle();
  });

  readLength();
  matchMedia(BREAKPOINT_QUERIES.phone).addEventListener('change', () => {
    readLength();
    render();
  });
  new MutationObserver(syncChecked).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  syncChecked();
  render();
  button.disabled = false;
}

/** Another tab changed the stored choice: follow it (or the system when it was cleared). */
function followOtherTabs(event: StorageEvent) {
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
  const value = event.newValue;
  if (value === 'light' || value === 'dark') {
    applyTheme(value, false);
  } else {
    applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', false);
  }
}

/** The persisted cord keeps its old DOM: copy the new page's label (locale switch). */
function relabel(event: Event) {
  const next = (event as Event & { newDocument?: Document }).newDocument;
  const label = next?.querySelector('[data-theme-toggle-label]')?.textContent;
  if (!label) return;
  document.querySelectorAll('[data-theme-toggle-label]').forEach((node) => {
    node.textContent = label;
  });
}

function bindAll() {
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach(bindThemeToggle);
}

/** Binds every cord now and after each client-side navigation. */
export function startThemeToggle() {
  bindAll();
  document.addEventListener('astro:page-load', bindAll);
  document.addEventListener('astro:before-swap', relabel);
  window.addEventListener('storage', followOtherTabs);
}
