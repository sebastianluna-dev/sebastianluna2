/**
 * Motion policy: what an appear plays, and how `prefers-reduced-motion` changes it
 * (animation-inventory.md §4, design-spec §8.1).
 *
 * - Normal: opacity and the individual transforms (`translate`, `scale`, `rotate`) in ONE animation,
 *   so they start together (decision 14) and never clobber the element's `transform`.
 * - Reduced: presets collapse to a 150 ms opacity fade with no delay; nothing moves and nothing waits
 *   hidden for a stagger or an intersection.
 *
 * Pure functions plus two tiny `matchMedia` helpers that are safe during SSR.
 */
import type {
  AppearKeyframe,
  AppearPlan,
  AppearPreset,
  MotionValues,
  StaggerMode,
} from '@/components/motion/types';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** `true` when the user asked for reduced motion. `false` on the server. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Calls `onChange` whenever the preference changes; returns the unsubscribe function. */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof matchMedia !== 'function') return () => {};
  const mq = matchMedia(REDUCED_MOTION_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

/** Transform properties an appear may animate, as individual CSS properties. */
export type AppearProperty = 'translate' | 'scale' | 'rotate';

const has = (values: MotionValues, key: keyof MotionValues) => values[key] !== undefined;

/** Which individual transform properties a preset animates. */
export function appearProperties(
  preset: Pick<AppearPreset, 'initial' | 'animate'>,
): AppearProperty[] {
  const { initial, animate } = preset;
  const props: AppearProperty[] = [];
  if (has(initial, 'x') || has(initial, 'y') || has(animate, 'x') || has(animate, 'y')) {
    props.push('translate');
  }
  if (has(initial, 'scale') || has(animate, 'scale')) props.push('scale');
  if (has(initial, 'rotate') || has(animate, 'rotate')) props.push('rotate');
  return props;
}

const px = (v: number) => `${v}px`;

function keyframe(
  values: MotionValues,
  props: AppearProperty[],
  fallback: MotionValues,
): AppearKeyframe {
  const pick = (key: keyof MotionValues, neutral: number) =>
    values[key] ?? fallback[key] ?? neutral;
  const frame: AppearKeyframe = { opacity: pick('opacity', 1) };
  if (props.includes('translate')) frame.translate = `${px(pick('x', 0))} ${px(pick('y', 0))}`;
  if (props.includes('scale')) frame.scale = String(pick('scale', 1));
  if (props.includes('rotate')) frame.rotate = `${pick('rotate', 0)}deg`;
  return frame;
}

/** Timing of the reduced-motion fade (`REDUCED_APPEAR` in presets.ts: 150 ms). */
export interface ReducedTiming {
  durationMs: number;
  easing: string;
}

export interface PlanOptions {
  /** Delay in ms, counted from the intersection. */
  delayMs?: number;
  reducedMotion: boolean;
  reducedTiming: ReducedTiming;
  /** `false` swaps the `linear()` chain for its least-squares `cubic-bezier()`. */
  linearSupported?: boolean;
}

/** What the engine animates for `preset` (WAAPI keyframes and timing). */
export function planAppear(preset: AppearPreset, options: PlanOptions): AppearPlan {
  const { initial, animate, timing } = preset;
  if (options.reducedMotion) {
    return {
      keyframes: [
        { opacity: initial.opacity ?? animate.opacity ?? 1 },
        { opacity: animate.opacity ?? 1 },
      ],
      durationMs: options.reducedTiming.durationMs,
      delayMs: 0,
      easing: options.reducedTiming.easing,
    };
  }
  const props = appearProperties(preset);
  return {
    keyframes: [keyframe(initial, props, animate), keyframe(animate, props, initial)],
    durationMs: timing.durationMs,
    delayMs: Math.max(0, options.delayMs ?? 0),
    easing: options.linearSupported === false ? timing.fallbackEasing : timing.easing,
  };
}

/**
 * Pre-animation state of a preset as CSS custom properties, read by the `html.js` rules of
 * `AppearMotion.astro`. They do nothing without JS (design-spec §8.1: never an inline state).
 */
export function appearInitialVars(preset: AppearPreset): Record<string, string> {
  const props = appearProperties(preset);
  const from = keyframe(preset.initial, props, preset.animate);
  const vars: Record<string, string> = { '--pf-appear-opacity': String(from.opacity) };
  if (from.translate) vars['--pf-appear-translate'] = from.translate;
  if (from.scale) vars['--pf-appear-scale'] = from.scale;
  if (from.rotate) vars['--pf-appear-rotate'] = from.rotate;
  return vars;
}

/** Serialises `appearInitialVars` for a `style` attribute. */
export function appearInitialStyle(preset: AppearPreset): string {
  return Object.entries(appearInitialVars(preset))
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

/**
 * Effective delay of an element (CA-01). `absolute`: its own delay, from its own intersection.
 * `section`: minus the delay of the first element of its group that intersected (never negative).
 */
export function resolveDelayMs(delayS: number, mode: StaggerMode, groupStartS?: number): number {
  const base = mode === 'section' && groupStartS !== undefined ? delayS - groupStartS : delayS;
  return Math.max(0, Math.round(base * 1000));
}
