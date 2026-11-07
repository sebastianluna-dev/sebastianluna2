/**
 * Hero objects behaviour (HE-19…HE-21), vanilla; the appear (HE-18) belongs to the page engine.
 *
 * - HE-19: the CSS float pauses while the object is out of view (100 px margin).
 * - HE-20: one shared `pointermove` listener feeds the speed EMA; a fast enough `pointerenter` plays
 *   the bump on the `bump` node. Improvements over the reference (hueco-2 §4): the animation is
 *   cancelled when it ends, leaving only animates back if a bump is running, and one call per enter.
 * - HE-21: a click crossfades the image to the next free object of the pool.
 *
 * Bump only with `(hover: hover) and (pointer: fine)` and without reduced motion; with reduced motion
 * the swap only fades. Binds on `astro:page-load` and releases everything on `astro:before-swap`.
 */
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import { HERO_OBJECT_BUMP, HERO_OBJECT_SWAP } from '@/components/motion/presets';
import {
  HERO_OBJECT_FLOAT,
  IDENTITY_TRANSFORM,
  bumpKeyframes,
  createPointerSample,
  initialQueue,
  pickNextObject,
  planBump,
  preloadCandidates,
  stepPointerSample,
} from '@/lib/hero-objects';

const ROOT = '[data-hero-objects]';
const OBJECT = '.hero-objects__object';
const BUMP = '.hero-objects__bump';
const IMAGE = '.hero-objects__image';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const pointer = createPointerSample();

function onPointerMove(event: PointerEvent) {
  stepPointerSample(pointer, event.clientX, event.clientY, Date.now());
}

function currentTransform(node: Element): string {
  const value = getComputedStyle(node).transform;
  return value === 'none' ? IDENTITY_TRANSFORM : value;
}

/** Wires one `[data-hero-objects]` layer; returns its teardown. */
function bindLayer(root: HTMLElement): () => void {
  const pool = JSON.parse(root.dataset.pool ?? '{}') as Record<string, string>;
  const ids = Object.keys(pool);
  const objects = [...root.querySelectorAll<HTMLElement>(OBJECT)];
  const queues = new Map<HTMLElement, string[]>();
  const bumps = new Map<HTMLElement, Animation>();
  const entering = new Map<HTMLImageElement, Animation>();
  const inView = new WeakSet<HTMLElement>();
  const preloaded = new Set<string>();
  const fine = matchMedia(FINE_POINTER);
  let reduced = prefersReducedMotion();
  let listening = false;

  const bumpEnabled = () => fine.matches && !reduced;

  function syncPointerListener() {
    const want = bumpEnabled();
    if (want === listening) return;
    listening = want;
    if (want) {
      pointer.time = 0;
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    } else {
      window.removeEventListener('pointermove', onPointerMove);
      Object.assign(pointer, createPointerSample());
    }
  }

  function stopBump(object: HTMLElement) {
    bumps.get(object)?.cancel();
    bumps.delete(object);
  }

  function playOnBump(
    object: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
  ) {
    const node = object.querySelector(BUMP);
    if (!node) return;
    stopBump(object);
    const animation = node.animate(keyframes, { ...options, fill: 'forwards' });
    bumps.set(object, animation);
    animation.finished
      .then(() => {
        if (bumps.get(object) !== animation) return;
        bumps.delete(object);
        animation.cancel(); // its last frame is the identity, so nothing jumps
      })
      .catch(() => {});
  }

  // HE-20: bump on a fast enter.
  function onEnter(event: PointerEvent) {
    const object = event.currentTarget as HTMLElement;
    prepareQueue(object);
    if (!bumpEnabled() || !inView.has(object)) return;
    const box = object.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const plan = planBump(
      pointer,
      Date.now(),
      (event.clientX - box.left) / box.width,
      (event.clientY - box.top) / box.height,
    );
    if (!plan) return;
    const node = object.querySelector(BUMP);
    if (!node) return;
    playOnBump(object, bumpKeyframes(currentTransform(node), plan.peak), {
      duration: plan.durationMs,
      easing: 'linear',
    });
  }

  // HE-20: back to identity only while a bump is running.
  function onLeave(event: PointerEvent) {
    const object = event.currentTarget as HTMLElement;
    if (!bumps.has(object)) return;
    const node = object.querySelector(BUMP);
    if (!node) return;
    playOnBump(object, [{ transform: currentTransform(node) }, { transform: IDENTITY_TRANSFORM }], {
      duration: HERO_OBJECT_BUMP.leaveMs,
      easing: HERO_OBJECT_BUMP.leaveEasing,
    });
  }

  // ---------------------------------------------------------------- HE-21 swap

  function visibleElsewhere(object: HTMLElement): Set<string> {
    return new Set(objects.filter((o) => o !== object).map((o) => o.dataset.object ?? ''));
  }

  function preload(list: string[]) {
    for (const id of list) {
      const src = pool[id];
      if (!src || preloaded.has(id)) continue;
      preloaded.add(id);
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = src;
    }
  }

  function prepareQueue(object: HTMLElement) {
    let queue = queues.get(object) ?? [];
    if (queue.length === 0) {
      queue = initialQueue(object.dataset.object ?? '', ids);
      queues.set(object, queue);
    }
    preload(preloadCandidates(queue, visibleElsewhere(object)));
  }

  function animateImage(image: HTMLImageElement, to: 'enter' | 'exit'): Animation {
    const { durationMs, reducedDurationMs, easing, enter, exit } = HERO_OBJECT_SWAP;
    const values = to === 'enter' ? enter : exit;
    const hidden: Keyframe = reduced
      ? { opacity: values.opacity }
      : { opacity: values.opacity, rotate: `${values.rotate}deg`, scale: String(values.scale) };
    const shown: Keyframe = reduced ? { opacity: 1 } : { opacity: 1, rotate: '0deg', scale: '1' };
    const keyframes = to === 'enter' ? [hidden, shown] : [hidden];
    return image.animate(keyframes, {
      duration: reduced ? reducedDurationMs : durationMs,
      easing,
      fill: to === 'enter' ? 'backwards' : 'forwards',
    });
  }

  function onClick(event: MouseEvent) {
    const object = event.currentTarget as HTMLElement;
    const current = object.dataset.object ?? '';
    const others = visibleElsewhere(object);
    const { next, remaining } = pickNextObject(current, queues.get(object) ?? [], others, ids);
    queues.set(object, remaining);
    preload(preloadCandidates(remaining, others));
    const src = pool[next];
    const bump = object.querySelector(BUMP);
    const shown = object.querySelector<HTMLImageElement>(`${IMAGE}:not([data-leaving])`);
    if (next === current || !src || !bump || !shown) return;

    // A clone keeps the scoped-style attribute of the SSR image.
    const incoming = shown.cloneNode(false) as HTMLImageElement;
    incoming.src = src;
    object.dataset.object = next;

    for (const image of bump.querySelectorAll<HTMLImageElement>(`${IMAGE}:not([data-leaving])`)) {
      image.dataset.leaving = '';
      const running = entering.get(image);
      if (running) {
        running.commitStyles();
        running.cancel();
        entering.delete(image);
      }
      animateImage(image, 'exit')
        .finished.then(() => image.remove())
        .catch(() => {});
    }
    bump.append(incoming);
    const enter = animateImage(incoming, 'enter');
    entering.set(incoming, enter);
    enter.finished
      .then(() => {
        if (entering.get(incoming) === enter) entering.delete(incoming);
      })
      .catch(() => {});
  }

  // ---------------------------------------------------------------- wiring

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const object = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          inView.add(object);
          delete object.dataset.offscreen;
        } else {
          inView.delete(object);
          object.dataset.offscreen = '';
          stopBump(object);
        }
      }
    },
    { rootMargin: HERO_OBJECT_FLOAT.inViewMargin },
  );

  const onPreferenceChange = () => {
    syncPointerListener();
    if (!bumpEnabled()) for (const object of objects) stopBump(object);
  };
  const stopWatchingReduced = watchReducedMotion((value) => {
    reduced = value;
    onPreferenceChange();
  });
  fine.addEventListener('change', onPreferenceChange);

  for (const object of objects) {
    observer.observe(object);
    object.addEventListener('pointerenter', onEnter);
    object.addEventListener('pointerleave', onLeave);
    object.addEventListener('pointerdown', () => prepareQueue(object));
    object.addEventListener('click', onClick);
  }
  syncPointerListener();

  return () => {
    observer.disconnect();
    stopWatchingReduced();
    fine.removeEventListener('change', onPreferenceChange);
    for (const object of objects) stopBump(object);
    if (listening) window.removeEventListener('pointermove', onPointerMove);
    listening = false;
  };
}

/** Bound layers and their teardowns. */
const bound = new Map<HTMLElement, () => void>();
let started = false;

function bindAll() {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT)) {
    if (!bound.has(root)) bound.set(root, bindLayer(root));
  }
}

function releaseAll() {
  for (const teardown of bound.values()) teardown();
  bound.clear();
}

/** Starts once per document; `<ClientRouter/>` navigations rebind and release. */
export function startHeroObjects(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  } else {
    bindAll();
  }
  document.addEventListener('astro:page-load', bindAll);
  document.addEventListener('astro:before-swap', releaseAll);
}
