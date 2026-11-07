/**
 * Pure logic of the hero objects (HE-19…HE-21; hero.md §5–7; hueco-2): pointer speed, the inertial
 * bump and the object pool behind the click swap. The DOM side lives in
 * `src/components/portfolio/home/hero-objects.client.ts`.
 *
 * Values come from the `data-pilot-props` of the reference (identical for the five objects):
 * float {amount 3, rotate .8, duration 6.6}, bump {distance 8, rotate 2.5, scale 1.025,
 * sensitivity 5, inertia .75}, cycle {duration .16}.
 */
import { HERO_OBJECT_BUMP, HERO_OBJECT_SWAP } from '@/components/motion/presets';

/** HE-19: idle float. The keyframes live in CSS; the observer margin gates the loop. */
export const HERO_OBJECT_FLOAT = {
  inViewMargin: '100px',
} as const;

export const IDENTITY_TRANSFORM = 'translate3d(0px, 0px, 0px) rotate(0deg) scale(1)';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
/** 4 decimals (+ 0 to drop −0): keeps `1e-12`-style noise out of the transform strings. */
const round4 = (value: number) => Math.round(value * 1e4) / 1e4 + 0;

// ------------------------------------------------------------------ pointer speed

export interface PointerSample {
  x: number;
  y: number;
  /** `Date.now()` of the last move; 0 before the first one. */
  time: number;
  vx: number;
  vy: number;
}

export function createPointerSample(): PointerSample {
  return { x: 0, y: 0, time: 0, vx: 0, vy: 0 };
}

/**
 * Feeds one `pointermove` into the speed estimate (px/s), in place:
 * v = .35·v + .65·Δpos / max(Δt, 8 ms). `Date.now()` as in the reference, so the effective
 * threshold stays the measured one (hueco-2 §5).
 */
export function stepPointerSample(sample: PointerSample, x: number, y: number, now: number): void {
  if (sample.time > 0) {
    const dt = Math.max(now - sample.time, HERO_OBJECT_BUMP.minStepMs);
    const keep = HERO_OBJECT_BUMP.smoothing;
    sample.vx = sample.vx * keep + ((x - sample.x) / dt) * 1000 * (1 - keep);
    sample.vy = sample.vy * keep + ((y - sample.y) / dt) * 1000 * (1 - keep);
  }
  sample.x = x;
  sample.y = y;
  sample.time = now;
}

// ------------------------------------------------------------------ bump

/** Speed (px/s) at which M reaches 1: max(2200, 5000 − 340·sensitivity) = 3300. */
export function bumpCeiling(sensitivity: number = HERO_OBJECT_BUMP.sensitivity): number {
  return Math.max(2200, 5000 - sensitivity * 340);
}

/** M for speed `u`, 0 below either gate (u < 260, or M < .055 ⇔ u < 812). */
export function bumpStrength(speed: number): number {
  const { minSpeed, minStrength, strengthExponent } = HERO_OBJECT_BUMP;
  if (speed < minSpeed) return 0;
  const strength = clamp((speed - minSpeed) / (bumpCeiling() - minSpeed), 0, 1) ** strengthExponent;
  return strength < minStrength ? 0 : strength;
}

/** round(210 + clamp(inertia, .45, 1.6)·20) = 225 ms with inertia .75. */
export function bumpDurationMs(inertia: number = HERO_OBJECT_BUMP.inertia): number {
  return Math.round(210 + clamp(inertia, 0.45, 1.6) * 20);
}

export interface BumpPlan {
  /** Peak transform at `peakOffset`. */
  peak: string;
  durationMs: number;
  strength: number;
}

/**
 * The bump an enter at (`relX`, `relY`) produces, or `null` when it must not play. `relX`/`relY` are
 * the pointer position inside the object box, 0…1.
 */
export function planBump(
  sample: PointerSample,
  now: number,
  relX: number,
  relY: number,
): BumpPlan | null {
  if (sample.time === 0 || now - sample.time > HERO_OBJECT_BUMP.staleMs) return null;
  const strength = bumpStrength(Math.hypot(sample.vx, sample.vy));
  if (strength === 0) return null;
  const rx = clamp((relX - 0.5) * 2, -1, 1);
  const ry = clamp((relY - 0.5) * 2, -1, 1);
  const direction = Math.atan2(sample.vy, sample.vx);
  const cos = Math.cos(direction);
  const sin = Math.sin(direction);
  const { distance, rotate, scale } = HERO_OBJECT_BUMP;
  const x = round4(cos * distance * strength);
  const y = round4(sin * distance * strength);
  const angle = round4((rx * sin - ry * cos) * rotate * strength);
  const s = round4(1 + (scale - 1) * strength);
  return {
    peak: `translate3d(${x}px, ${y}px, 0px) rotate(${angle}deg) scale(${s})`,
    durationMs: bumpDurationMs(),
    strength,
  };
}

/** WAAPI keyframes of a bump that starts from `from` (the current computed transform). */
export function bumpKeyframes(from: string, peak: string): Keyframe[] {
  return [
    { transform: from, offset: 0 },
    { transform: peak, offset: HERO_OBJECT_BUMP.peakOffset, easing: HERO_OBJECT_BUMP.peakEasing },
    { transform: IDENTITY_TRANSFORM, offset: 1, easing: HERO_OBJECT_BUMP.settleEasing },
  ];
}

// ------------------------------------------------------------------ pool (click swap)

/** Fisher–Yates on a copy. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

export interface PoolPick {
  next: string;
  /** What is left of this slot's queue (the next click pops from its end). */
  remaining: string[];
}

/**
 * Next object of a slot: pops from its shuffled queue, skipping the current one and those visible in
 * the other slots; when the queue runs dry it reshuffles the whole pool. Stays on `current` when no
 * other object is free.
 */
export function pickNextObject(
  current: string,
  queue: readonly string[],
  visibleElsewhere: ReadonlySet<string>,
  pool: readonly string[],
  random: () => number = Math.random,
): PoolPick {
  const free = (id: string) => id !== current && !visibleElsewhere.has(id);
  const fromQueue = queue.filter(free);
  const candidates = fromQueue.length > 0 ? fromQueue : shuffle(pool, random).filter(free);
  const next = candidates.pop() ?? current;
  return { next, remaining: candidates };
}

/** A slot's first queue: the shuffled pool without its current object. */
export function initialQueue(
  current: string,
  pool: readonly string[],
  random: () => number = Math.random,
): string[] {
  return shuffle(pool, random).filter((id) => id !== current);
}

/** Objects worth preloading for a slot: the last free ones of its queue (they pop first). */
export function preloadCandidates(
  queue: readonly string[],
  visibleElsewhere: ReadonlySet<string>,
  count: number = HERO_OBJECT_SWAP.preload,
): string[] {
  return queue.filter((id) => !visibleElsewhere.has(id)).slice(-count);
}
