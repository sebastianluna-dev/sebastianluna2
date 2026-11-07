/**
 * Spring → CSS `linear()` easing, precomputed so the browser runs it with WAAPI or CSS.
 *
 * Implements docs/animation-inventory.md §2 and §4:
 * - `{ bounce, duration }` springs are solved to `{ stiffness, damping }` with Newton's method on the
 *   envelope of the damped oscillator (11 steps from ω = 5 / duration, safe minimum .001), the same
 *   numerical recipe the reference site's animation library uses, so the chains match byte for byte.
 * - The closed-form damped oscillator is evaluated in its three regimes (under-, critically and
 *   over-damped), with the analytic velocity in all of them (ζ ≥ 1 included: hueco-1).
 * - Settling is evaluated on keyframes [0, 100] with restSpeed 2 u/s and restDelta .5 u, in 50 ms steps,
 *   which is what gives the cards (HO-01) their 650 ms.
 * - `{ bounce, duration }` springs last `ceil(duration / 50) · 50` ms and jump to 1 at `t ≥ duration`
 *   with the raw duration (460, 280 and 400 ms), not at the 50 ms step.
 * - The chain samples one point every 10 ms with 4 decimals.
 *
 * Pure module: no DOM, safe to import from build code, tests and the client.
 */

/** Spring defined by its perceived duration (seconds) and bounce (0 = no overshoot). */
export interface DurationSpring {
  bounce: number;
  /** Seconds. */
  duration: number;
}

/** Spring defined by its physics. */
export interface PhysicalSpring {
  stiffness: number;
  damping: number;
  mass?: number;
  /** Initial velocity in units per second on the evaluated scale. */
  velocity?: number;
  restSpeed?: number;
  restDelta?: number;
}

export type SpringSpec = DurationSpring | PhysicalSpring;

export interface ResolvedSpring {
  stiffness: number;
  damping: number;
  mass: number;
  /** ζ = c / (2·√(k·m)). */
  dampingRatio: number;
  /** Raw duration in ms for `{ bounce, duration }` springs; `null` for physical ones. */
  durationMs: number | null;
}

export interface SpringSolution {
  /** Position at `tMs` milliseconds. */
  position(tMs: number): number;
  /** Velocity in units per second at `tMs` milliseconds. */
  velocity(tMs: number): number;
}

export interface LinearEasing {
  /** `linear(…)` string, ready for WAAPI `easing` or CSS `animation-timing-function`. */
  easing: string;
  /** Duration of the WAAPI animation that must use this easing, in ms (50 ms steps). */
  durationMs: number;
  /** Progress values of the chain (0 → 1), evenly spaced over `durationMs`. */
  points: number[];
  spring: ResolvedSpring;
}

export interface LinearOptions {
  /** Sample spacing in ms (10, like the reference). */
  stepMs?: number;
  /** Decimals per point (4, like the reference). */
  precision?: number;
}

// Solver and settling constants (animation-inventory.md §2).
const SAFE_MIN = 0.001;
const NEWTON_STEPS = 11;
const MIN_DAMPING_RATIO = 0.05;
const MAX_DAMPING_RATIO = 1;
const MIN_DURATION_S = 0.01;
const MAX_DURATION_S = 10;
const SCALE = 100;
const REST_SPEED = 2;
const REST_DELTA = 0.5;
const SETTLE_STEP_MS = 50;
const MAX_SETTLE_MS = 20_000;
const SAMPLE_STEP_MS = 10;
const PRECISION = 4;

const clamp = (lo: number, hi: number, v: number) => Math.min(Math.max(v, lo), hi);

export function isDurationSpring(spec: SpringSpec): spec is DurationSpring {
  return (
    !('stiffness' in spec || 'damping' in spec || 'mass' in spec) &&
    ('duration' in spec || 'bounce' in spec)
  );
}

/** Solves `{ bounce, duration }` to physics (mass 1, start at rest). */
function solveDurationSpring({ bounce, duration }: DurationSpring): ResolvedSpring {
  const zeta = clamp(MIN_DAMPING_RATIO, MAX_DAMPING_RATIO, 1 - bounce);
  const d = clamp(MIN_DURATION_S, MAX_DURATION_S, duration);
  const v = 0;
  let f: (w: number) => number;
  let df: (w: number) => number;
  if (zeta < 1) {
    const s = Math.sqrt(1 - zeta * zeta);
    // f(ω) = safeMin − (ωζ − v) / (ω·√(1−ζ²)) · e^(−ωζd): the envelope reaches safeMin at t = d.
    f = (w) => SAFE_MIN - ((w * zeta - v) / (w * s)) * Math.exp(-w * zeta * d);
    df = (w) => {
      const a = w * zeta * d;
      return (-Math.exp(-a) * (v + v * a - zeta * zeta * w * w * d)) / (w * w * s);
    };
  } else {
    f = (w) => -SAFE_MIN + Math.exp(-w * d) * ((w - v) * d + 1);
    df = (w) => Math.exp(-w * d) * (v - w) * (d * d);
  }
  let w = 5 / d;
  for (let i = 0; i < NEWTON_STEPS; i++) w -= f(w) / df(w);
  const mass = 1;
  const stiffness = w * w * mass;
  return {
    stiffness,
    damping: zeta * 2 * Math.sqrt(mass * stiffness),
    mass,
    dampingRatio: zeta,
    durationMs: d * 1000,
  };
}

/** Physics of any spring spec. */
export function resolveSpring(spec: SpringSpec): ResolvedSpring {
  if (isDurationSpring(spec)) return solveDurationSpring(spec);
  const mass = spec.mass ?? 1;
  return {
    stiffness: spec.stiffness,
    damping: spec.damping,
    mass,
    dampingRatio: spec.damping / (2 * Math.sqrt(spec.stiffness * mass)),
    durationMs: null,
  };
}

/**
 * Closed-form damped oscillator from `from` to `to` with initial velocity `v0` (units/s).
 * Time in ms, velocity in units per second.
 */
export function springSolution(
  spring: Pick<ResolvedSpring, 'stiffness' | 'damping' | 'mass' | 'dampingRatio'>,
  from: number,
  to: number,
  v0 = 0,
): SpringSolution {
  const w0 = Math.sqrt(spring.stiffness / spring.mass);
  const zeta = spring.dampingRatio;
  const x0 = from - to;
  if (zeta < 1) {
    const alpha = zeta * w0;
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const b = (v0 + alpha * x0) / wd;
    return {
      position: (tMs) => {
        const t = tMs / 1000;
        return to + Math.exp(-alpha * t) * (x0 * Math.cos(wd * t) + b * Math.sin(wd * t));
      },
      velocity: (tMs) => {
        const t = tMs / 1000;
        return (
          Math.exp(-alpha * t) * (v0 * Math.cos(wd * t) - (alpha * b + x0 * wd) * Math.sin(wd * t))
        );
      },
    };
  }
  if (zeta === 1) {
    const b = v0 + w0 * x0;
    return {
      position: (tMs) => {
        const t = tMs / 1000;
        return to + Math.exp(-w0 * t) * (x0 + b * t);
      },
      velocity: (tMs) => {
        const t = tMs / 1000;
        return Math.exp(-w0 * t) * (v0 - w0 * b * t);
      },
    };
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -w0 * (zeta - root);
  const r2 = -w0 * (zeta + root);
  const c1 = (v0 - r2 * x0) / (r1 - r2);
  const c2 = x0 - c1;
  return {
    position: (tMs) => {
      const t = tMs / 1000;
      return to + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    },
    velocity: (tMs) => {
      const t = tMs / 1000;
      return c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
    },
  };
}

/**
 * `done(t)` of the spring evaluated on [0, 100], as the WAAPI path of the reference does:
 * `{ bounce, duration }` ends at `t ≥ duration`; physical springs end when both speed and distance rest.
 */
function doneOnScale(spec: SpringSpec, spring: ResolvedSpring): (tMs: number) => boolean {
  if (spring.durationMs !== null) {
    const raw = spring.durationMs;
    return (tMs) => tMs >= raw;
  }
  const physical = spec as PhysicalSpring;
  const restSpeed = physical.restSpeed ?? REST_SPEED;
  const restDelta = physical.restDelta ?? REST_DELTA;
  const sol = springSolution(spring, 0, SCALE, physical.velocity ?? 0);
  return (tMs) =>
    Math.abs(sol.velocity(tMs)) <= restSpeed && Math.abs(SCALE - sol.position(tMs)) <= restDelta;
}

/** Duration of the WAAPI animation: first 50 ms step at which the spring is done (max 20 s). */
export function springDurationMs(spec: SpringSpec): number {
  const spring = resolveSpring(spec);
  const done = doneOnScale(spec, spring);
  let t = 0;
  while (!done(t) && t < MAX_SETTLE_MS) t += SETTLE_STEP_MS;
  return Math.min(t, MAX_SETTLE_MS);
}

/** Spring → `linear()` chain plus the duration the animation must have. */
export function springToLinear(spec: SpringSpec, options: LinearOptions = {}): LinearEasing {
  const stepMs = options.stepMs ?? SAMPLE_STEP_MS;
  const factor = 10 ** (options.precision ?? PRECISION);
  const spring = resolveSpring(spec);
  const done = doneOnScale(spec, spring);
  const v0 = isDurationSpring(spec) ? 0 : (spec.velocity ?? 0);
  const sol = springSolution(spring, 0, SCALE, v0);
  const durationMs = springDurationMs(spec);
  const n = Math.max(Math.round(durationMs / stepMs), 2);
  const points: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = durationMs * (i / (n - 1));
    const value = done(t) ? SCALE : sol.position(t);
    // `+ 0` folds -0 into 0 so the string never prints "-0".
    points.push(Math.round((value / SCALE) * factor) / factor + 0);
  }
  return { easing: `linear(${points.join(', ')})`, durationMs, points, spring };
}

// ---------------------------------------------------------------- cubic-bezier fallback

/** Control points of a CSS `cubic-bezier(x1, y1, x2, y2)`. */
export type BezierPoints = readonly [number, number, number, number];

/** Evaluates a CSS cubic-bezier timing function: progress x (0–1) → eased y. */
export function cubicBezier([x1, y1, x2, y2]: BezierPoints): (x: number) => number {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  const bx3 = (u: number) => ((ax * u + bx) * u + cx) * u;
  const dbx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  const solveU = (x: number) => {
    let u = x;
    for (let i = 0; i < 8; i++) {
      const err = bx3(u) - x;
      if (Math.abs(err) < 1e-7) return u;
      const d = dbx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    // Bisection when Newton does not converge (flat segments).
    let lo = 0;
    let hi = 1;
    u = x;
    for (let i = 0; i < 40; i++) {
      const v = bx3(u);
      if (Math.abs(v - x) < 1e-7) break;
      if (v < x) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return u;
  };
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const u = solveU(x);
    return ((ay * u + by) * u + cy) * u;
  };
}

export interface BezierFallback {
  /** `cubic-bezier(…)` string for browsers without `linear()`. */
  easing: string;
  points: BezierPoints;
  /** Largest |bezier − spring| over the fitted samples (progress units). */
  maxError: number;
}

/**
 * Least-squares fit of a `cubic-bezier()` to the spring curve, for browsers without `linear()`.
 *
 * Fits the four control points (x1, x2 constrained to [0, 1], y free so overshoot is allowed) by
 * minimising the sum of squared errors over every 2 ms sample of the exact spring (with the same
 * `done` cut as the chain) with Nelder–Mead from several deterministic starts, then rounds to
 * 3 decimals. A cubic cannot oscillate, so springs with visible ringing lose the second bounce;
 * the page presets overshoot ≤ 1.5 %, so the fit stays within a few hundredths (see the tests).
 * There is no measured value to copy (animation-inventory.md §2, "Fallback").
 */
export function springToCubicBezier(spec: SpringSpec): BezierFallback {
  const spring = resolveSpring(spec);
  const done = doneOnScale(spec, spring);
  const v0 = isDurationSpring(spec) ? 0 : (spec.velocity ?? 0);
  const sol = springSolution(spring, 0, SCALE, v0);
  const durationMs = springDurationMs(spec);
  const samples: Array<[number, number]> = [];
  for (let t = 0; t <= durationMs; t += 2) {
    samples.push([t / durationMs, done(t) ? 1 : sol.position(t) / SCALE]);
  }
  const cost = (p: number[]) => {
    const pts: BezierPoints = [clamp(0, 1, p[0]), p[1], clamp(0, 1, p[2]), p[3]];
    const ease = cubicBezier(pts);
    let sum = 0;
    for (const [x, y] of samples) sum += (ease(x) - y) ** 2;
    return sum;
  };
  const starts = [
    [0.25, 0.1, 0.25, 1],
    [0.2, 0.8, 0.3, 1],
    [0.3, 1.2, 0.5, 1],
    [0.1, 0.6, 0.2, 1],
  ];
  let best = starts[0];
  let bestCost = Infinity;
  for (const start of starts) {
    const p = nelderMead(cost, start);
    const c = cost(p);
    if (c < bestCost) {
      bestCost = c;
      best = p;
    }
  }
  const round = (v: number) => Math.round(v * 1000) / 1000 + 0;
  const points: BezierPoints = [
    round(clamp(0, 1, best[0])),
    round(best[1]),
    round(clamp(0, 1, best[2])),
    round(best[3]),
  ];
  const ease = cubicBezier(points);
  let maxError = 0;
  for (const [x, y] of samples) maxError = Math.max(maxError, Math.abs(ease(x) - y));
  return { easing: `cubic-bezier(${points.join(', ')})`, points, maxError };
}

/** Plain Nelder–Mead simplex minimiser (deterministic, fixed iteration budget). */
function nelderMead(f: (p: number[]) => number, start: number[], iterations = 600): number[] {
  const n = start.length;
  let simplex = [start.slice()];
  for (let i = 0; i < n; i++) {
    const p = start.slice();
    p[i] += 0.1;
    simplex.push(p);
  }
  let values = simplex.map(f);
  for (let it = 0; it < iterations; it++) {
    const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    simplex = order.map(([, i]) => simplex[i]);
    values = order.map(([v]) => v);
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const worst = simplex[n];
    const at = (k: number) => centroid.map((c, j) => c + k * (worst[j] - c));
    const reflected = at(-1);
    const fr = f(reflected);
    if (fr < values[0]) {
      const expanded = at(-2);
      const fe = f(expanded);
      if (fe < fr) {
        simplex[n] = expanded;
        values[n] = fe;
      } else {
        simplex[n] = reflected;
        values[n] = fr;
      }
    } else if (fr < values[n - 1]) {
      simplex[n] = reflected;
      values[n] = fr;
    } else {
      const contracted = at(0.5);
      const fc = f(contracted);
      if (fc < values[n]) {
        simplex[n] = contracted;
        values[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          values[i] = f(simplex[i]);
        }
      }
    }
  }
  const bestIndex = values.indexOf(Math.min(...values));
  return simplex[bestIndex];
}
