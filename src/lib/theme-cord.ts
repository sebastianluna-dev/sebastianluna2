/**
 * Geometry and gesture rules of the theme cord (TE-02…TE-05, interacciones.md §5.1,
 * estados.md §5, decisiones 17 and 23). Pure functions: the DOM side lives in
 * `components/portfolio/theme/theme-toggle.client.ts`, the springs in `components/motion/presets.ts`.
 */

/** Measured constants of the reference cord (interacciones.md §5.1). */
export const CORD = {
  /** F: cord length from the top of the page to the handle (D/T), and on phones. Mirrors the CSS. */
  length: 142,
  lengthPhone: 128,
  /** L: how far the handle can travel down before the rubber band takes over completely. */
  pullDistance: 58,
  /** X: crossing this pull (px) switches the theme, once per gesture. */
  threshold: 18,
  /** The pull is linear up to this fraction of L, then rubber-banded. */
  linearRatio: 0.72,
  /** Rubber band length (px) past the linear part. */
  rubber: 34,
  /** Sideways travel is `side·tanh(dx/side)`: at most ±36 px. */
  side: 36,
  /** A gesture that moves this little (px) is a tap (TE-05). */
  tapSlop: 6,
  /** The tap tug goes to min(L, X + tugExtra) = 30 px. */
  tugExtra: 12,
  /** Mouse hover drop of the handle (TE-02). */
  hoverDrop: 4,
  /** The SVG of the cord is 48×220; the cord hangs from its centre line. */
  anchorX: 24,
  /** The path ends this far below the handle's top edge, hidden under the knob. */
  tail: 2,
  /** Haptic pulse on switch (ms), where `navigator.vibrate` exists. */
  hapticMs: 50,
  /**
   * Decision 17: on touch, a first movement upwards of more than `tapSlop` px yields the gesture to
   * the page scroll. `touch-action: none` cannot hand it back to the browser, so the page is
   * scrolled by hand and released with this exponential decay (ms), the usual inertial-scroll
   * time constant.
   */
  flingTimeConstantMs: 325,
} as const;

/** Motion's `easeOut`, the curve of the 140 ms tap tug (TE-05). */
export const CORD_TUG_EASE: readonly [number, number, number, number] = [0, 0, 0.58, 1];

/** Sideways offset of the handle for a horizontal drag of `dx` px. */
export function cordX(dx: number): number {
  return CORD.side * Math.tanh(dx / CORD.side);
}

/** Vertical offset of the handle for a downward drag of `dy` px (never above rest). */
export function cordY(dy: number): number {
  const pull = Math.max(0, dy);
  const linear = CORD.pullDistance * CORD.linearRatio;
  if (pull <= linear) return pull;
  return linear + CORD.rubber * (1 - Math.exp(-(pull - linear) / CORD.rubber));
}

/** Rotation of the handle (deg) so that it keeps pointing along the cord. */
export function cordAngle(x: number, y: number, length: number): number {
  return (-Math.atan2(x, length + y) * 180) / Math.PI;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** `d` of the cord path in the 48×220 SVG, for a handle offset (x, y) and a cord length. */
export function cordPath(x: number, y: number, length: number): string {
  return `M ${CORD.anchorX} 0 L ${round(CORD.anchorX + x)} ${round(length + y + CORD.tail)}`;
}

/** Where the tap tug pulls the handle to (TE-05): 30 px. */
export function tugTarget(): number {
  return Math.min(CORD.pullDistance, CORD.threshold + CORD.tugExtra);
}

/** Whether a pull of `pull` px (after the rubber band) switches the theme. */
export function crossesThreshold(pull: number): boolean {
  return pull >= CORD.threshold;
}

export type ReleaseOutcome = 'pull' | 'tap' | 'none';

/**
 * What a release does when the gesture has not switched the theme yet: `pull` past the threshold
 * switches, a near-still `tap` switches and tugs, anything else just springs back.
 */
export function releaseOutcome(originY: number, dx: number, dy: number): ReleaseOutcome {
  const pull = Math.max(0, Math.min(CORD.pullDistance, originY + dy));
  if (crossesThreshold(pull)) return 'pull';
  if (Math.hypot(dx, dy) <= CORD.tapSlop) return 'tap';
  return 'none';
}

export type TouchIntent = 'pending' | 'pull' | 'scroll';

/**
 * Decision 17: the first movement of a touch gesture decides whether it pulls the cord or scrolls
 * the page. Undecided until it leaves the tap slop; mostly upwards means scroll.
 */
export function touchIntent(dx: number, dy: number): TouchIntent {
  if (Math.hypot(dx, dy) <= CORD.tapSlop) return 'pending';
  return dy < 0 && -dy >= Math.abs(dx) ? 'scroll' : 'pull';
}

/**
 * Distance (px) an inertial scroll released at `velocity` px/s has covered after `elapsedMs`,
 * with the decay of `CORD.flingTimeConstantMs`.
 */
export function flingOffset(velocity: number, elapsedMs: number): number {
  const tau = CORD.flingTimeConstantMs;
  return (velocity / 1000) * tau * (1 - Math.exp(-elapsedMs / tau));
}

/** The fling has stopped mattering once less than half a pixel is left to travel. */
export function flingDone(velocity: number, elapsedMs: number): boolean {
  const tau = CORD.flingTimeConstantMs;
  return Math.abs((velocity / 1000) * tau * Math.exp(-elapsedMs / tau)) < 0.5;
}
