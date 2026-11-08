// Blue's eyes (BL-13): where they look and when they blink. Pure, so the launcher's vanilla
// controller only measures and writes styles. Values come from `BLUE_EYES` in presets.ts.

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/**
 * Gaze from the pointer, as the reference measures it: the offset from the launcher's centre over
 * half the viewport on each axis, clamped to ±`limit`. Screen axes: positive x is right, positive y
 * is down.
 */
export function gazeFrom(pointer: Point, center: Point, viewport: Size, limit = 1): Point {
  const clamp = (value: number) => Math.max(-limit, Math.min(limit, value));
  const halfW = Math.max(1, viewport.width / 2);
  const halfH = Math.max(1, viewport.height / 2);
  return {
    x: clamp((pointer.x - center.x) / halfW),
    y: clamp((pointer.y - center.y) / halfH),
  };
}

export interface GazeScale {
  /** Whole figure: translation (px) and tilt (deg) at full gaze. */
  body: { x: number; y: number; tiltX: number; tiltY: number };
  /** Eyes, on top of the figure (px) at full gaze. */
  eyes: { x: number; y: number };
}

/** CSS values for a gaze: the figure turns towards the pointer and the eyes look further. */
export function gazeStyle(gaze: Point, scale: GazeScale) {
  const round = (value: number) => Math.round(value * 100) / 100 + 0;
  // Facing the pointer: rotateY > 0 turns the face right, rotateX > 0 turns it up (the parent
  // sets the perspective).
  return {
    body:
      `translate(${round(gaze.x * scale.body.x)}px, ${round(gaze.y * scale.body.y)}px) ` +
      `rotateY(${round(gaze.x * scale.body.tiltY)}deg) rotateX(${round(-gaze.y * scale.body.tiltX)}deg)`,
    eyes: `${round(gaze.x * scale.eyes.x)}px ${round(gaze.y * scale.eyes.y)}px`,
  };
}

export interface BlinkTiming {
  /** Wait between blinks (ms). */
  interval: readonly [number, number];
  /** How long the eyes stay closed (ms). */
  closed: readonly [number, number];
  /** Chance of a second, quicker blink right after. */
  doubleChance: number;
  /** Open time between the two blinks of a double (ms). */
  doubleGap: readonly [number, number];
  /** Closed time of the second blink (ms). */
  doubleClosed: readonly [number, number];
}

/** One blink, or a double: times (ms) from the moment it is planned. */
export interface BlinkPlan {
  /** When the eyes close and open again, in order: [close, open, close?, open?]. */
  steps: number[];
  /** When to plan the next one. */
  next: number;
}

/** Plans the next blink. `random` returns [0, 1), injectable for tests. */
export function planBlink(timing: BlinkTiming, random: () => number = Math.random): BlinkPlan {
  const between = ([min, max]: readonly [number, number]) => min + random() * (max - min);
  const close = between(timing.interval);
  const open = close + between(timing.closed);
  const steps = [close, open];
  if (random() < timing.doubleChance) {
    const again = open + between(timing.doubleGap);
    steps.push(again, again + between(timing.doubleClosed));
  }
  return { steps: steps.map(Math.round), next: Math.round(steps[steps.length - 1]!) };
}
