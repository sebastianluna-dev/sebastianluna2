/**
 * Bootstrap of the technology wall (EF-06…EF-08). Small on purpose: the WebGL renderer, the shader
 * and the worker load only after the page load, once idle: at once with a hardware GPU and enough cores
 * (EF-07 fades during the load, as in the reference), when the wall reaches the viewport elsewhere.
 *
 * - Without JS, or without WebGL2 / Worker, or after a lost context: the DOM logos stay, in grey.
 * - Magnetism (EF-08) moves the DOM logos and the canvas marks; mouse only, never with reduced motion.
 * - Reduced motion: the metal is drawn once and stays still; the DOM ↔ canvas swap is instant.
 * - Rebinds on `astro:page-load` and tears everything down on `astro:before-swap`.
 */
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import type { ThemeName } from '@/components/portfolio/theme/theme.inline';
import { canPreheatMetal, magnetOffsets, type Point } from './metal-marks/layout';
import { METAL_RUNTIME } from './metal-marks/tuning';
import type { MetalField } from './metal-marks/field';

const ROOT_SELECTOR = '[data-metal-marks]';
const MARK_SELECTOR = '.logo-wall__mark';
const METAL_ON = 'logo-wall__mark_metal_on';
const CANVAS_CLASS = 'logo-wall__canvas';

const teardowns = new Map<HTMLElement, () => void>();

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function supportsMetal(): boolean {
  return typeof WebGL2RenderingContext !== 'undefined' && typeof Worker !== 'undefined';
}

/** Name of the GPU behind WebGL2 ('' when unknown); the probe context is released at once. */
function webglRenderer(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

function preheats(): boolean {
  return canPreheatMetal(
    navigator.hardwareConcurrency || 0,
    webglRenderer(),
    METAL_RUNTIME.lowEndCores,
  );
}

function hasBox(element: HTMLElement): boolean {
  return element.getClientRects().length > 0 && element.offsetWidth > 0;
}

function bind(root: HTMLElement): () => void {
  const marks = [...root.querySelectorAll<HTMLElement>(MARK_SELECTOR)];
  const masses = marks.map((mark) => Number.parseFloat(mark.dataset.mass ?? '') || 1);
  let reduced = prefersReducedMotion();
  let field: MetalField | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let destroyed = false;
  let mounting = false;
  let pointer: Point | null = null;
  let frame = 0;
  let near = false;
  let inView = false;
  const cleanups: Array<() => void> = [];

  // EF-08: offsets from the untransformed cell centres, applied to the DOM and the canvas.
  const applyMagnet = () => {
    frame = 0;
    if (!pointer) return;
    const wall = root.getBoundingClientRect();
    if (wall.width <= 0 || wall.height <= 0) return;
    const centers = marks.map((mark) => {
      const cell = mark.parentElement?.getBoundingClientRect();
      return cell
        ? { x: cell.left + cell.width / 2, y: cell.top + cell.height / 2 }
        : { x: -1e6, y: -1e6 };
    });
    magnetOffsets(pointer, centers, masses, wall.width).forEach((offset, index) => {
      marks[index].style.transform =
        `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)`;
      field?.setOffset(index, offset.x, offset.y);
    });
  };

  const resetMagnet = () => {
    pointer = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    marks.forEach((mark, index) => {
      mark.style.removeProperty('transform');
      field?.setOffset(index, 0, 0);
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || reduced) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(applyMagnet);
  };
  root.addEventListener('pointermove', onPointerMove);
  root.addEventListener('pointerleave', resetMagnet);
  cleanups.push(() => {
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerleave', resetMagnet);
    resetMagnet();
  });

  cleanups.push(
    watchReducedMotion((value) => {
      reduced = value;
      if (value) resetMagnet();
      field?.setReducedMotion(value);
    }),
  );

  const unmountField = () => {
    field?.destroy();
    field = null;
    canvas?.remove();
    canvas = null;
    for (const mark of marks) mark.classList.remove(METAL_ON);
  };

  const mount = async () => {
    if (mounting || field || destroyed) return;
    mounting = true;
    try {
      const { MetalField } = await import('./metal-marks/field');
      if (destroyed) return;
      canvas = document.createElement('canvas');
      canvas.className = CANVAS_CLASS;
      canvas.setAttribute('aria-hidden', 'true');
      root.append(canvas);
      field = new MetalField({
        root,
        canvas,
        marks: marks.flatMap((element) => {
          const svg = element.querySelector('svg');
          const ratio = Number.parseFloat(element.dataset.ratio ?? '');
          return svg && ratio > 0 ? [{ element, svg, ratio }] : [];
        }),
        theme: currentTheme(),
        reduced,
        onMarkReady: (index) => marks[index]?.classList.add(METAL_ON),
        onFailure: () => queueMicrotask(unmountField),
      });
      field?.setVisible(inView);
      field?.setPageVisible(document.visibilityState !== 'hidden');
    } catch {
      unmountField();
    } finally {
      mounting = false;
    }
  };

  if (supportsMetal() && typeof IntersectionObserver !== 'undefined') {
    let idle = false;
    let preheat = false;
    const tryMount = () => {
      if (idle && (preheat || near) && hasBox(root)) void mount();
    };
    const whenIdle = () => {
      const go = () => {
        idle = true;
        preheat = preheats();
        tryMount();
      };
      if ('requestIdleCallback' in window) {
        const handle = requestIdleCallback(go, { timeout: METAL_RUNTIME.mountIdleTimeoutMs });
        cleanups.push(() => cancelIdleCallback(handle));
      } else {
        const handle = setTimeout(go, 0);
        cleanups.push(() => clearTimeout(handle));
      }
    };
    if (document.readyState === 'complete') whenIdle();
    else {
      window.addEventListener('load', whenIdle, { once: true });
      cleanups.push(() => window.removeEventListener('load', whenIdle));
    }
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        tryMount();
      },
      { rootMargin: METAL_RUNTIME.mountRootMargin },
    );
    const viewObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      field?.setVisible(inView);
    });
    const resizeObserver = new ResizeObserver(() => {
      tryMount();
      field?.layout();
    });
    nearObserver.observe(root);
    viewObserver.observe(root);
    resizeObserver.observe(root);

    const onVisibility = () => field?.setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibility);

    const themeObserver = new MutationObserver(() => field?.setTheme(currentTheme()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    cleanups.push(() => {
      nearObserver.disconnect();
      viewObserver.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    });
  }

  return () => {
    destroyed = true;
    for (const cleanup of cleanups) cleanup();
    unmountField();
  };
}

function bindAll() {
  for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    if (!teardowns.has(root)) teardowns.set(root, bind(root));
  }
}

function teardownAll() {
  for (const teardown of teardowns.values()) teardown();
  teardowns.clear();
}

let started = false;

export function startMetalMarks() {
  if (started) return;
  started = true;
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  else bindAll();
  document.addEventListener('astro:page-load', bindAll);
  document.addEventListener('astro:before-swap', teardownAll);
}
