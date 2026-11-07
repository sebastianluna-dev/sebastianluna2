/**
 * Star field host (EF-09, EF-10). Mounts a canvas only while the dark theme is on, renders it in a
 * worker when the browser can (OffscreenCanvas), and runs the shooting stars with WAAPI.
 * Paused off screen, in a hidden tab and with `prefers-reduced-motion` (a still frame, no meteors).
 * The host element is `transition:persist`, so this binds once and survives navigations.
 */
import { REDUCED_MOTION_QUERY } from '@/lib/motion-policy';
import { meteorKeyframes, meteorPauseMs, planMeteor, starfieldDpr } from '@/lib/starfield';
import { createStarfield, type StarfieldMessage } from './stellar-field';

interface RenderHost {
  post(message: StarfieldMessage): void;
  stop(): void;
}

const bound = new WeakSet<HTMLElement>();
const reducedQuery = () => matchMedia(REDUCED_MOTION_QUERY);

function mainThreadHost(canvas: HTMLCanvasElement): RenderHost {
  const handle = createStarfield(
    (callback) => requestAnimationFrame(callback),
    (id) => cancelAnimationFrame(id),
  );
  return {
    post: (message) => handle(message.type === 'init' ? { ...message, canvas } : message),
    stop: () => handle({ type: 'run', on: false, still: false }),
  };
}

/** Worker host, or `null` when the browser cannot render off the main thread. */
function workerHost(canvas: HTMLCanvasElement, onError: () => void): RenderHost | null {
  if (
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    !('transferControlToOffscreen' in canvas)
  ) {
    return null;
  }
  let worker: Worker;
  try {
    worker = new Worker(new URL('./stellar.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
  let offscreen: OffscreenCanvas;
  try {
    offscreen = canvas.transferControlToOffscreen();
  } catch {
    worker.terminate();
    return null;
  }
  worker.addEventListener('error', onError);
  let transferred = false;
  return {
    post(message) {
      if (message.type === 'init' && !transferred) {
        transferred = true;
        worker.postMessage({ ...message, canvas: offscreen }, [offscreen]);
      } else {
        worker.postMessage(message);
      }
    },
    stop: () => worker.terminate(),
  };
}

function bindStellar(root: HTMLElement) {
  if (bound.has(root)) return;
  bound.add(root);

  const sky = root.querySelector<HTMLElement>('.pf-stellar__sky');
  const meteor = root.querySelector<HTMLElement>('.pf-stellar__meteor');
  if (!sky || !meteor) return;

  const html = document.documentElement;
  const reduced = reducedQuery();
  let forceMainThread = false;
  let host: RenderHost | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let width = 1;
  let height = 1;
  let inView = true;
  let running = false;
  let meteorTimer = 0;
  let meteorAnimation: Animation | null = null;

  const measure = () => {
    width = Math.max(1, root.clientWidth);
    height = Math.max(1, root.clientHeight);
  };

  const stopMeteors = () => {
    clearTimeout(meteorTimer);
    meteorTimer = 0;
    meteorAnimation?.cancel();
    meteorAnimation = null;
  };

  // EF-10: one streak at a time, then a random pause of 0…200 frames.
  const scheduleMeteor = (pauseMs: number) => {
    stopMeteors();
    if (!running || reduced.matches || typeof meteor.animate !== 'function') return;
    meteorTimer = window.setTimeout(() => {
      if (!running) return;
      const plan = planMeteor(Math.random, width, height);
      meteor.style.setProperty('--pf-stellar-meteor-length', `${plan.length}px`);
      meteorAnimation = meteor.animate(meteorKeyframes(plan), {
        duration: plan.durationMs,
        easing: 'linear',
        fill: 'both',
      });
      meteorAnimation.onfinish = () => scheduleMeteor(meteorPauseMs(Math.random));
    }, pauseMs);
  };

  const updateRun = () => {
    if (!host) return;
    const on = inView && !document.hidden && !reduced.matches;
    host.post({ type: 'run', on, still: reduced.matches });
    if (on && !running) {
      running = true;
      scheduleMeteor(0);
    } else if (!on && running) {
      running = false;
      stopMeteors();
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    const before = [width, height];
    measure();
    if (!host || (before[0] === width && before[1] === height)) return;
    host.post({ type: 'resize', width, height, dpr: starfieldDpr(devicePixelRatio, width) });
  });
  const viewObserver = new IntersectionObserver(([entry]) => {
    inView = Boolean(entry?.isIntersecting);
    updateRun();
  });

  const unmount = () => {
    if (!host) return;
    running = false;
    stopMeteors();
    host.stop();
    host = null;
    canvas?.remove();
    canvas = null;
    resizeObserver.disconnect();
    viewObserver.disconnect();
    document.removeEventListener('visibilitychange', updateRun);
    reduced.removeEventListener('change', updateRun);
    root.removeAttribute('data-active');
  };

  const mount = () => {
    if (host) return;
    canvas = document.createElement('canvas');
    canvas.className = 'pf-stellar__canvas';
    sky.replaceChildren(canvas);
    const fallBack = () => {
      // The worker failed to load after the canvas was transferred: start over on the main thread.
      unmount();
      forceMainThread = true;
      if (isDark()) mount();
    };
    host = (!forceMainThread && workerHost(canvas, fallBack)) || mainThreadHost(canvas);
    measure();
    host.post({
      type: 'init',
      canvas: null,
      width,
      height,
      dpr: starfieldDpr(devicePixelRatio, width),
      sky: getComputedStyle(root).getPropertyValue('--pf-stellar-sky').trim(),
      origin: performance.timeOrigin,
    });
    root.setAttribute('data-active', '');
    resizeObserver.observe(root);
    viewObserver.observe(root);
    document.addEventListener('visibilitychange', updateRun);
    reduced.addEventListener('change', updateRun);
    updateRun();
  };

  const isDark = () => html.dataset.theme === 'dark';
  const sync = () => {
    if (!root.isConnected) {
      unmount();
      themeObserver.disconnect();
      document.removeEventListener('astro:after-swap', sync);
      bound.delete(root);
      return;
    }
    // Mid-swap the router may leave <html> without `data-theme` for a microtask: not a theme change.
    if (!html.hasAttribute('data-theme')) return;
    if (isDark()) mount();
    else unmount();
  };

  const themeObserver = new MutationObserver(sync);
  themeObserver.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('astro:after-swap', sync);
  sync();
}

function bindAll() {
  document.querySelectorAll<HTMLElement>('[data-stellar]').forEach(bindStellar);
}

/** Binds every star field on the page now and after each client-side navigation. */
export function startStellar() {
  bindAll();
  document.addEventListener('astro:page-load', bindAll);
}
