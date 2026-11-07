/**
 * Analytic spring for the global chrome (pill nav SH-01…SH-03, theme rope TE-02…TE-05).
 *
 * Every frame advances the state (x, v) from where it is with the closed-form solution of the damped
 * oscillator, so it is exact for any `dt` and a retarget mid-flight keeps the velocity (what motion's
 * `layoutId` does). Semi-implicit Euler at 4 ms undershot the rope by 11 % (hueco-6 §5), hence analytic.
 * With `prefers-reduced-motion: reduce`, `set()` jumps straight to the target (animation-inventory §4).
 */
import { prefersReducedMotion } from '@/lib/motion-policy';

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
  /** Rest distance to the target, in the value's units. */
  restDelta?: number;
  /** Rest speed, in the value's units per second. */
  restSpeed?: number;
}

/** Frame clock, injectable for tests. Times in ms. */
export interface FrameScheduler {
  now(): number;
  /**
   * Time of the frame being produced, on the rAF clock (`document.timeline.currentTime`). A tween that
   * starts from it lands its first step a whole frame in, as motion does; `now()` when absent.
   */
  frameTime?(): number;
  request(cb: (time: number) => void): number;
  cancel(id: number): void;
}

export interface SpringOptions {
  scheduler?: FrameScheduler;
  /** Evaluated on every `set()`; defaults to the `prefers-reduced-motion` media query. */
  reducedMotion?: () => boolean;
}

export interface SetOptions {
  /** Jump to the target without animating. */
  jump?: boolean;
  /** Replace the current velocity (units/s), e.g. the pointer's on release. */
  velocity?: number;
}

export interface Spring {
  /** Retargets the spring, keeping its velocity unless `velocity` is given. */
  set(target: number, options?: SetOptions): void;
  get(): number;
  velocity(): number;
  target(): number;
  isAnimating(): boolean;
  /** Freezes the spring where it is (velocity is kept for a later `set`). */
  stop(): void;
  /** Resolves when the spring is at rest. */
  finished(): Promise<void>;
}

const DEFAULT_REST = 0.05;
/** Longest step a single frame may integrate (s): avoids jumps after a background tab. */
const MAX_FRAME_S = 1 / 20;
/** Velocity tracker: samples older than this are ignored (motion's `getVelocity()`). */
const VELOCITY_WINDOW_MS = 50;
const VELOCITY_SAMPLES = 4;

/**
 * Advances a damped oscillator by `dt` seconds. `x` is the displacement from the target and `v` its
 * velocity (units/s). Returns the new [x, v]. Exact in the three regimes.
 */
export function stepSpring(
  x: number,
  v: number,
  dt: number,
  stiffness: number,
  damping: number,
  mass = 1,
): [number, number] {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const alpha = zeta * w0;
    const e = Math.exp(-alpha * dt);
    const b = (v + alpha * x) / wd;
    const cos = Math.cos(wd * dt);
    const sin = Math.sin(wd * dt);
    return [e * (x * cos + b * sin), e * (v * cos - (alpha * b + x * wd) * sin)];
  }
  if (zeta === 1) {
    const e = Math.exp(-w0 * dt);
    const b = v + w0 * x;
    return [(x + b * dt) * e, (v - w0 * b * dt) * e];
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - root);
  const r2 = -w0 * (zeta + root);
  const c1 = (v - r2 * x) / (r1 - r2);
  const c2 = x - c1;
  const e1 = Math.exp(r1 * dt);
  const e2 = Math.exp(r2 * dt);
  return [c1 * e1 + c2 * e2, c1 * r1 * e1 + c2 * r2 * e2];
}

const browserScheduler: FrameScheduler = {
  now: () => performance.now(),
  frameTime: () => {
    const time = typeof document === 'undefined' ? null : document.timeline?.currentTime;
    return typeof time === 'number' ? time : performance.now();
  },
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

/** Creates a spring at `initial` that calls `onUpdate(value)` on every frame it moves. */
export function createSpring(
  initial: number,
  config: SpringConfig,
  onUpdate: (value: number) => void,
  options: SpringOptions = {},
): Spring {
  const clock = options.scheduler ?? browserScheduler;
  const reduced = options.reducedMotion ?? prefersReducedMotion;
  const mass = config.mass ?? 1;
  const restDelta = config.restDelta ?? DEFAULT_REST;
  const restSpeed = config.restSpeed ?? DEFAULT_REST;
  let x = initial;
  let v = 0;
  let goal = initial;
  let frame = 0;
  let last = 0;
  let waiters: Array<() => void> = [];

  const settle = () => {
    x = goal;
    v = 0;
    frame = 0;
    onUpdate(x);
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve();
  };

  const step = (time: number) => {
    const dt = Math.min(Math.max(time - last, 0) / 1000, MAX_FRAME_S);
    last = time;
    const [dx, nv] = stepSpring(x - goal, v, dt, config.stiffness, config.damping, mass);
    x = goal + dx;
    v = nv;
    if (Math.abs(v) <= restSpeed && Math.abs(x - goal) <= restDelta) {
      settle();
      return;
    }
    onUpdate(x);
    frame = clock.request(step);
  };

  return {
    set(target, opts = {}) {
      goal = target;
      if (opts.jump || reduced()) {
        if (frame) clock.cancel(frame);
        settle();
        return;
      }
      if (opts.velocity !== undefined) v = opts.velocity;
      if (!frame) {
        // From the current frame, as motion's frameloop does: the first step moves a whole frame.
        last = clock.frameTime?.() ?? clock.now();
        frame = clock.request(step);
      }
    },
    get: () => x,
    velocity: () => v,
    target: () => goal,
    isAnimating: () => frame !== 0,
    stop() {
      if (frame) clock.cancel(frame);
      frame = 0;
    },
    finished: () =>
      frame ? new Promise<void>((resolve) => waiters.push(resolve)) : Promise.resolve(),
  };
}

export interface VelocityTracker {
  push(value: number, time?: number): void;
  /** Velocity in units/s from the recent samples, 0 if the last one is older than 50 ms. */
  get(time?: number): number;
  reset(): void;
}

/** Pointer velocity on release, like motion's `MotionValue.getVelocity()` (TE-04). */
export function createVelocityTracker(
  now: () => number = () => performance.now(),
): VelocityTracker {
  let samples: Array<[number, number]> = [];
  return {
    push(value, time = now()) {
      samples.push([time, value]);
      if (samples.length > VELOCITY_SAMPLES) samples.shift();
    },
    get(time = now()) {
      if (samples.length < 2) return 0;
      const [t0, v0] = samples[0];
      const [t1, v1] = samples[samples.length - 1];
      if (time - t1 > VELOCITY_WINDOW_MS || t1 === t0) return 0;
      return ((v1 - v0) * 1000) / (t1 - t0);
    },
    reset() {
      samples = [];
    },
  };
}

/**
 * Short eased tween on the frame clock (the rope's 140 ms tug, TE-05). Jumps to `to` with reduced
 * motion. Resolves when done; `cancel` stops it where it is.
 */
export function tween(
  from: number,
  to: number,
  durationMs: number,
  ease: (progress: number) => number,
  onUpdate: (value: number) => void,
  options: SpringOptions = {},
): { finished: Promise<void>; cancel(): void } {
  const clock = options.scheduler ?? browserScheduler;
  const reduced = options.reducedMotion ?? prefersReducedMotion;
  if (reduced() || durationMs <= 0) {
    onUpdate(to);
    return { finished: Promise.resolve(), cancel: () => {} };
  }
  let frame = 0;
  let resolve: () => void = () => {};
  const finished = new Promise<void>((r) => (resolve = r));
  // From the current frame: starting at `now()` made the first step land at p = 0 (TE-05, F5).
  const start = clock.frameTime?.() ?? clock.now();
  const step = (time: number) => {
    const p = Math.min(1, Math.max(0, time - start) / durationMs);
    onUpdate(from + (to - from) * ease(p));
    if (p < 1) frame = clock.request(step);
    else {
      frame = 0;
      resolve();
    }
  };
  frame = clock.request(step);
  return {
    finished,
    cancel() {
      if (frame) clock.cancel(frame);
      frame = 0;
      resolve();
    },
  };
}
