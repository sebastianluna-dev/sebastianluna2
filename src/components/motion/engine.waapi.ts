/**
 * Page appear engine on WAAPI (animation-inventory.md §3.3 "Apariciones de página", §4).
 *
 * One `element.animate()` per appear with opacity and individual transforms together, the spring
 * precomputed to `linear()` (or its `cubic-bezier()` fallback), `fill: both` while it runs, and on the
 * end `commitStyles()` + `cancel()` so finished animations never pile up in `getAnimations()`.
 */
import { planAppear } from '@/lib/motion-policy';
import { presetFor, REDUCED_APPEAR, type AppearPresetName } from './presets';
import type { AppearHandle, AppearOptions, Breakpoint, MotionEngine } from './types';

let linearSupport: boolean | undefined;

/** `linear()` support, detected once (evergreen browsers since 2023). */
export function supportsLinearEasing(): boolean {
  if (linearSupport === undefined) {
    linearSupport =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('animation-timing-function', 'linear(0, 1)');
  }
  return linearSupport;
}

export const waapiEngine: MotionEngine<AppearPresetName> = {
  appear(
    el: HTMLElement,
    name: AppearPresetName,
    bp: Breakpoint,
    options: AppearOptions,
  ): AppearHandle {
    const preset = presetFor(name, bp);
    const plan = planAppear(preset, {
      delayMs: options.delayMs,
      reducedMotion: options.reducedMotion,
      reducedTiming: REDUCED_APPEAR,
      linearSupported: options.linearSupported ?? supportsLinearEasing(),
    });
    const animation = el.animate(plan.keyframes, {
      duration: plan.durationMs,
      delay: plan.delayMs,
      easing: plan.easing,
      fill: 'both',
    });
    // Start on the current frame's time, as motion does (its batch timestamp): a pending play waits
    // 2–3 frames for its ready time, so every delay counted from later than its trigger (review F4).
    const frameTime = document.timeline?.currentTime;
    if (typeof frameTime === 'number') animation.startTime = frameTime;
    let settled = false;
    let resolve: () => void = () => {};
    const finished = new Promise<void>((r) => (resolve = r));
    const settle = (commit: boolean) => {
      if (settled) return;
      settled = true;
      if (commit) {
        try {
          animation.commitStyles();
        } catch {
          // Not rendered (display: none): nothing to commit, the CSS end state applies.
        }
      }
      animation.cancel();
      resolve();
    };
    animation.addEventListener('finish', () => settle(true));
    animation.addEventListener('cancel', () => settle(false));
    return {
      finished,
      finish() {
        if (settled) return;
        // Jump to the end state now (also skips a pending delay), then commit synchronously.
        animation.finish();
        settle(true);
      },
      cancel: () => settle(false),
    };
  },
};
