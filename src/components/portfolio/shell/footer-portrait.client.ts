/**
 * Footer scene (SH-09…SH-17), vanilla WAAPI.
 *
 * - SH-09 trigger: an IntersectionObserver with a 240 px margin wakes the check; the scene starts
 *   once fonts and the head image are decoded and the portrait shows at least
 *   min(55 % of its height, 35 % of the viewport) at the same place for 240 ms (polled every 60 ms).
 *   It plays once per stage and announces itself with `pf:footer-enter { startedAt }`.
 * - SH-10…SH-16 run as WAAPI animations with `fill: backwards`: each holds its first
 *   keyframe through its delay and, when it ends, the element's own CSS (the end state) shows again.
 *   The first keyframes equal the `html.js [data-footer-scene=pending]` rules, so nothing jumps.
 * - Skip: focus anywhere in the footer, or reduced motion, puts the scene in its end state at once
 *   (accesibilidad D-18; the reference lets Tab land on invisible buttons).
 * - SH-17: two seconds after the start, a fine pointer near the head makes it duck.
 *
 * State on the stage: `data-footer-scene` = pending → playing → done.
 */
import { FOOTER_SCENE } from '@/components/motion/presets';
import {
  handTracks,
  headRiseKeyframes,
  sceneShowsEnough,
  socialEntranceDelay,
} from '@/lib/footer-scene';
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import { scriptsActive } from '@/lib/scripts-ready';

export const FOOTER_ENTER_EVENT = 'pf:footer-enter';
const DUCK_QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

type SceneState = 'pending' | 'playing' | 'done';

// ------------------------------------------------------------------ scene controller

interface Controller {
  skip(): void;
  destroy(): void;
}

const controllers = new Map<HTMLElement, Controller>();

function part<T extends Element = HTMLElement>(root: ParentNode, name: string): T | null {
  return root.querySelector<T & Element>(`[data-footer-part="${name}"]`);
}

function createScene(stage: HTMLElement): Controller {
  const portrait = stage.querySelector<HTMLElement>('[data-footer-portrait]');
  const head = portrait ? part<HTMLImageElement>(portrait, 'head') : null;
  const duck = portrait ? part(portrait, 'duck') : null;
  /** The head box (A × L of the reference); the image inside is our crop of the portrait. */
  const headBox = portrait ? part(portrait, 'rise') : null;
  const cleanups: (() => void)[] = [];
  const animations: Animation[] = [];
  let state = (stage.dataset.footerScene as SceneState | undefined) ?? 'pending';
  let startedAt = 0;

  const setState = (next: SceneState) => {
    state = next;
    stage.dataset.footerScene = next;
  };

  // ---------------------------------------------------------------- SH-17 duck

  const duckMedia = matchMedia(DUCK_QUERY);
  let duckEnabled = false;
  let ducked = false;
  let duckAnimation: Animation | undefined;
  let duckTimer = 0;
  let duckFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let enableTimer = 0;

  const animateDuck = (keyframes: Keyframe[], duration: number, easing: string) => {
    if (!duck) return;
    const from = getComputedStyle(duck).translate;
    keyframes[0] = { ...keyframes[0], translate: from && from !== 'none' ? from : '0 0' };
    duckAnimation?.cancel();
    duckAnimation = duck.animate(keyframes, { duration, easing, fill: 'forwards' });
  };

  const checkDuck = () => {
    duckFrame = 0;
    if (!headBox) return;
    const rect = headBox.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const d = FOOTER_SCENE.duck;
    const near =
      Math.hypot(
        pointerX - (rect.left + rect.width / 2),
        pointerY - (rect.top + rect.height * d.anchorShare),
      ) < Math.max(d.minRadiusPx, rect.width * d.radiusShare);
    const depth = `0 ${(rect.height * d.depthShare).toFixed(1)}px`;
    if (near && !ducked) {
      window.clearTimeout(duckTimer);
      ducked = true;
      animateDuck([{ translate: '0 0' }, { translate: depth }], d.downMs, d.downEasing);
    } else if (!near && ducked) {
      window.clearTimeout(duckTimer);
      duckTimer = window.setTimeout(() => {
        ducked = false;
        animateDuck(
          [
            { translate: depth },
            { translate: `0 ${d.overshootPx}px`, offset: d.overshootOffset },
            { translate: '0 0' },
          ],
          d.upMs,
          d.upEasing,
        );
      }, d.holdMs);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!duckEnabled || event.pointerType !== 'mouse' || !duckMedia.matches) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    duckFrame ||= requestAnimationFrame(checkDuck);
  };

  const enableDuck = (afterMs: number) => {
    window.clearTimeout(enableTimer);
    enableTimer = window.setTimeout(
      () => {
        duckEnabled = true;
      },
      Math.max(0, afterMs),
    );
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('pointermove', onPointerMove);
    window.clearTimeout(duckTimer);
    window.clearTimeout(enableTimer);
    cancelAnimationFrame(duckFrame);
    duckAnimation?.cancel();
  });

  // ---------------------------------------------------------------- SH-10…SH-16

  const play = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
    if (!el) return;
    animations.push(el.animate(keyframes, { fill: 'backwards', ...options }));
  };

  const playSocials = () => {
    const s = FOOTER_SCENE.socials;
    const elapsed = performance.now() - startedAt;
    stage.querySelectorAll<HTMLElement>('[data-footer-social]').forEach((item, index) => {
      const delay = socialEntranceDelay(index, elapsed);
      if (delay === null) return;
      play(
        item,
        [
          { opacity: 0, transform: 'translateY(10px) scale(0.88)', offset: 0 },
          { opacity: 1, transform: 'translateY(0) scale(1.035)', offset: s.peakOffset },
          { opacity: 1, transform: 'translateY(0) scale(1)', offset: 1 },
        ],
        { duration: s.durationMs, delay, easing: s.easing },
      );
    });
  };

  const start = () => {
    if (state !== 'pending' || !portrait) return;
    stopTrigger();
    startedAt = performance.now();
    const t = FOOTER_SCENE;

    portrait.querySelectorAll<HTMLElement>('[data-footer-part="edge"]').forEach((edge) => {
      const horizontal = /_side_(top|bottom)/.test(edge.className);
      play(edge, [{ scale: horizontal ? '0 1' : '1 0' }, { scale: '1 1' }], {
        duration: t.edges.durationMs,
        easing: t.edges.easing,
      });
    });
    // Keyframe arrays ease every segment, as Framer does with a single `ease`.
    play(
      part(portrait, 'frame'),
      t.frame.scale.map((scale) => ({ scale: String(scale), easing: t.frame.easing })),
      { delay: t.frame.delayMs, duration: t.frame.durationMs },
    );
    play(
      part(portrait, 'label'),
      [
        { opacity: 0, translate: `0 ${t.label.y}px`, scale: String(t.label.scale) },
        { opacity: 1, translate: '0 0', scale: '1' },
      ],
      { delay: t.label.delayMs, duration: t.label.durationMs, easing: t.label.easing },
    );
    play(
      part(portrait, 'reveal'),
      [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }],
      { delay: t.reveal.delayMs, duration: t.reveal.durationMs, easing: t.reveal.easing },
    );
    const name = part(portrait, 'name');
    play(name, [{ translate: `0 ${t.nameRise.y}px` }, { translate: '0 0' }], {
      delay: t.nameRise.delayMs,
      duration: t.nameRise.durationMs,
      easing: t.nameRise.easing,
    });
    play(
      name,
      t.nameScale.scale.map((scale, i) => ({
        scale: String(scale),
        offset: t.nameScale.offsets[i],
        easing: t.nameScale.easing,
      })),
      { delay: t.nameScale.delayMs, duration: t.nameScale.durationMs },
    );

    if (head && headBox) {
      const timing = { delay: t.head.delayMs, duration: t.head.durationMs };
      play(headBox, headRiseKeyframes(headBox.getBoundingClientRect().height), timing);
      const { sway } = t.head;
      play(
        head,
        sway.offsets.map((offset, i) => ({
          translate: `${sway.x[i]}px 0`,
          rotate: `${sway.rotate[i]}deg`,
          offset,
          easing: t.head.swayEasing,
        })),
        timing,
      );
      play(head, [{ scale: String(t.head.scale.from) }, { scale: '1' }], {
        delay: t.head.delayMs,
        duration: t.head.scale.durationMs,
        easing: t.head.scale.easing,
      });
    }

    // SH-15
    portrait.querySelectorAll<SVGElement>('[data-footer-part="hand"]').forEach((hand, index) => {
      for (const { keyframes, timing } of handTracks(index)) play(hand, keyframes, timing);
    });

    playSocials();
    setState('playing');
    enableDuck(t.duck.enableAfterMs);
    window.dispatchEvent(new CustomEvent(FOOTER_ENTER_EVENT, { detail: { startedAt } }));

    const running = animations.slice();
    Promise.all(running.map((animation) => animation.finished)).then(
      () => {
        if (state === 'playing') setState('done');
        animations.length = 0;
      },
      () => {}, // cancelled by a skip
    );
  };

  const skip = () => {
    if (state === 'done') return;
    stopTrigger();
    for (const animation of animations) animation.cancel();
    animations.length = 0;
    const wasPlaying = state === 'playing';
    setState('done');
    if (!wasPlaying) {
      startedAt = performance.now();
      window.dispatchEvent(new CustomEvent(FOOTER_ENTER_EVENT, { detail: { startedAt } }));
    }
    enableDuck(0);
  };

  // ---------------------------------------------------------------- SH-09 trigger

  let near = false;
  let ready = false;
  let preparing = false;
  let stableSince = 0;
  let lastTop = Number.NaN;
  let pollTimer = 0;
  let frame = 0;
  let observer: IntersectionObserver | undefined;

  const check = () => {
    frame = 0;
    if (state !== 'pending' || !near || !ready || !portrait) return;
    const rect = portrait.getBoundingClientRect();
    if (!sceneShowsEnough(rect, innerHeight)) {
      stableSince = 0;
      return;
    }
    const now = performance.now();
    const top = rect.top + scrollY;
    if (!stableSince || Math.abs(top - lastTop) > FOOTER_SCENE.trigger.toleratePx) {
      lastTop = top;
      stableSince = now;
    }
    if (now - stableSince < FOOTER_SCENE.trigger.stableMs) {
      pollTimer = window.setTimeout(check, FOOTER_SCENE.trigger.pollMs);
      return;
    }
    start();
  };

  const schedule = () => {
    window.clearTimeout(pollTimer);
    if (!frame && near && ready) frame = requestAnimationFrame(check);
  };

  const prepare = async () => {
    if (preparing) return;
    preparing = true;
    if (head) head.loading = 'eager';
    await document.fonts?.ready;
    await head?.decode().catch(() => {});
    ready = true;
    schedule();
  };

  const listenScroll = (on: boolean) => {
    if (on) {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
    } else {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    }
  };

  function stopTrigger() {
    observer?.disconnect();
    observer = undefined;
    listenScroll(false);
    window.clearTimeout(pollTimer);
    cancelAnimationFrame(frame);
    frame = 0;
  }
  cleanups.push(stopTrigger);

  if (state === 'pending' && portrait) {
    // Reduced motion, or the no-JS rescue of theme.inline.ts already fired: the end state at once.
    if (prefersReducedMotion() || !scriptsActive()) {
      skip();
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          near = entry?.isIntersecting ?? false;
          listenScroll(near);
          if (near) {
            void prepare();
            schedule();
          } else {
            window.clearTimeout(pollTimer);
            stableSince = 0;
          }
        },
        { rootMargin: `${FOOTER_SCENE.trigger.rootMarginPx}px` },
      );
      observer.observe(portrait);
    }
  } else if (state !== 'pending') {
    // A retained stage that already played (bound again after a full reload is impossible).
    enableDuck(0);
  }

  return {
    skip,
    destroy() {
      for (const cleanup of cleanups) cleanup();
      for (const animation of animations) animation.cancel();
    },
  };
}

// ------------------------------------------------------------------ binding

function syncCopyrightYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll<HTMLElement>('[data-copyright-year]').forEach((el) => {
    if (el.textContent !== year) el.textContent = year;
  });
}

function bind() {
  for (const [stage, controller] of controllers) {
    if (!stage.isConnected) {
      controller.destroy();
      controllers.delete(stage);
    }
  }
  document.querySelectorAll<HTMLElement>('[data-footer-scene]').forEach((stage) => {
    if (!controllers.has(stage)) controllers.set(stage, createScene(stage));
  });
  syncCopyrightYear();
}

/** Focus anywhere in the footer ends the scene, so Tab never lands on a hidden button. */
function onFocusIn(event: FocusEvent) {
  const footer = (event.target as Element | null)?.closest?.('footer');
  const stage = footer?.querySelector<HTMLElement>('[data-footer-scene]');
  if (stage) controllers.get(stage)?.skip();
}

document.addEventListener('focusin', onFocusIn);
// `astro:page-load` runs after every navigation; binding is idempotent, so also bind right away.
document.addEventListener('astro:page-load', bind);
if (document.readyState !== 'loading') bind();
else document.addEventListener('DOMContentLoaded', bind, { once: true });
watchReducedMotion((reduced) => {
  if (reduced) for (const controller of controllers.values()) controller.skip();
});
