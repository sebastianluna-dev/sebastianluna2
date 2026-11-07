/**
 * Types of the page appear engine (design-spec §4 "motion/", animation-inventory §3.3 and §4).
 */

/** D ≥ 1200, T 810–1199.98, P ≤ 809.98. */
export type Breakpoint = 'desktop' | 'tablet' | 'phone';

/** Animated values. `x`/`y` in px, `rotate` in degrees. */
export interface MotionValues {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
}

/** Spring defined by perceived duration (s) and bounce. */
export interface DurationSpringTransition {
  type: 'spring';
  bounce: number;
  duration: number;
}

/** Spring defined by physics; when present it wins over any duration (HO-01). */
export interface PhysicalSpringTransition {
  type: 'spring';
  stiffness: number;
  damping: number;
  mass?: number;
}

export interface TweenTransition {
  type: 'tween';
  /** Seconds. */
  duration: number;
  ease: readonly [number, number, number, number];
}

export type AppearTransition =
  DurationSpringTransition | PhysicalSpringTransition | TweenTransition;

/** Timing resolved at authoring time (springs precomputed to `linear()`, tested for drift). */
export interface AppearTiming {
  durationMs: number;
  /** `linear(…)` for springs, `cubic-bezier(…)` for tweens. */
  easing: string;
  /** Used where `linear()` is not supported. */
  fallbackEasing: string;
}

export interface AppearPreset {
  initial: MotionValues;
  animate: MotionValues;
  transition: AppearTransition;
  timing: AppearTiming;
}

/** A preset per breakpoint. All the reference overrides equal the default (68/68). */
export type ResponsivePreset = Record<Breakpoint, AppearPreset>;

/**
 * How delays combine inside a group (CA-01): `absolute` uses each element's delay as is, counted from
 * its own intersection (the reference); `section` subtracts the delay of the first element of the
 * group that entered the viewport, so a section does not wait for the global stagger.
 */
export type StaggerMode = 'absolute' | 'section';

export interface AppearOptions {
  /** Delay in ms, counted from the moment the element intersects. */
  delayMs?: number;
  reducedMotion: boolean;
  /** Whether the browser understands `linear()`; defaults to feature detection. */
  linearSupported?: boolean;
}

export interface AppearHandle {
  /** Resolves when the appear ended (finished, skipped by focus or cancelled). */
  finished: Promise<void>;
  /** Jumps to the end state now (focusin). */
  finish(): void;
  /** Stops without committing; the element keeps whatever CSS says. */
  cancel(): void;
}

export interface MotionEngine<Name extends string = string> {
  appear(el: HTMLElement, preset: Name, bp: Breakpoint, options: AppearOptions): AppearHandle;
}

/**
 * One WAAPI keyframe with individual transform properties (they never clobber `transform`).
 * A type alias, not an interface, so it is assignable to the DOM `Keyframe`.
 */
export type AppearKeyframe = {
  opacity?: number;
  translate?: string;
  scale?: string;
  rotate?: string;
};

/** What the engine plays for an appear: the result of the motion policy. */
export interface AppearPlan {
  keyframes: [AppearKeyframe, AppearKeyframe];
  durationMs: number;
  delayMs: number;
  easing: string;
}
