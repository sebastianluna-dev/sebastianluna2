/**
 * Star field of the dark theme (EF-09, EF-10; componentes-js.md §7, design-spec §5).
 * Pure data and maths shared by the canvas renderer (worker or main thread) and the
 * shooting-star scheduler. Nothing here touches the DOM.
 */

/** Measured parameters of the reference field (componentes-js.md §7). */
export const STARFIELD = {
  smallStars: 300,
  bigStars: 70,
  /** Twinkle and drift speeds of the reference defaults. */
  twinkleSpeed: 10,
  driftSpeed: 2,
  /** Frame rate of the canvas loop. */
  fps: 24,
  /** Device pixel ratio caps: 1.5, and 1.25 below the tablet breakpoint. */
  dprCap: 1.5,
  dprCapNarrow: 1.25,
  narrowBelow: 810,
  /** Size buckets (px radius) of the sprite atlas. */
  smallSizes: [0.3, 0.5, 0.7, 0.9],
  bigSizes: [1.4, 1.85, 2.3, 2.75, 3.2],
  /** Brightness levels of the atlas, from the trough to the crest of the twinkle. */
  levels: 12,
  /** Wrap margin (px) so stars leave the edge before they reappear on the other side. */
  wrapMargin: 4,
  /** Twinkle amplitude around each star's base alpha, and the alpha clamps. */
  twinkleAmplitude: 0.35,
  alphaMax: 0.95,
  alphaMinSmall: 0.05,
  alphaMinBig: 0.08,
  /** Ray length of the big stars, in radii. */
  rayLength: 5.5,
  /** Glow radius of a sprite, in radii, at the trough and its growth to the crest. */
  glowBase: 1.2,
  glowGrowth: 1.5,
  /** Seed of the layout: the same sky on every visit. Ours, not the reference's. */
  seed: 0x5eba1a5,
} as const;

/** Shooting star (EF-10): measured ranges, in frames of 60 fps and px. */
export const METEOR = {
  angleDeg: 45,
  /** Speed in px per 60 fps frame. */
  speedMin: 4,
  speedMax: 8,
  /** Visible length of the streak. */
  lengthMin: 100,
  lengthMax: 200,
  /** Life of a streak, in 60 fps frames. */
  framesMin: 50,
  framesMax: 140,
  /** Pause before the next streak, in 60 fps frames (0…200). */
  pauseMaxFrames: 200,
  /** Spawn area, as fractions of the viewport. */
  spawnWidth: 0.8,
  spawnHeight: 0.45,
  /** Opacity keyframes: fade in by 15 %, hold to 65 %, fade out. */
  fadeIn: 0.15,
  fadeOut: 0.65,
  frameMs: 1000 / 60,
} as const;

export interface Star {
  /** Position as a fraction of the (wrapped) field. */
  rx: number;
  ry: number;
  /** Base alpha around which the star twinkles. */
  base: number;
  phase: number;
  /** Twinkle angular speed, rad per ms. */
  freq: number;
  /** Drift, px per second. */
  dx: number;
  dy: number;
  big: boolean;
  /** Index into the small or big size list. */
  bucket: number;
}

/** Mulberry32: a small, fast, seeded PRNG in [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Index of the value in `list` closest to `value`. */
export function nearestIndex(value: number, list: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < list.length; i++) {
    if (Math.abs(list[i] - value) < Math.abs(list[best] - value)) best = i;
  }
  return best;
}

/** The deterministic star layout: `small` dim points followed by `big` four-ray stars. */
export function createStars(
  small: number = STARFIELD.smallStars,
  big: number = STARFIELD.bigStars,
  twinkle: number = STARFIELD.twinkleSpeed,
  drift: number = STARFIELD.driftSpeed,
  seed: number = STARFIELD.seed,
): Star[] {
  const random = createRandom(seed);
  const driftRange = (5 / 200) * drift * 60;
  const stars: Star[] = [];
  for (let i = 0; i < small + big; i++) {
    const isBig = i >= small;
    const [minSize, maxSize, brightness] = isBig ? [1.2, 3.5, 1] : [0.2, 1, 0.7];
    const size = random() * (maxSize - minSize) + minSize;
    stars.push({
      rx: random(),
      ry: random(),
      base: (random() * 0.3 + 0.7) * brightness,
      phase: random() * Math.PI * 2,
      freq: (random() * 0.012 + 0.002) * (twinkle / 20),
      dx: (random() - 0.5) * driftRange,
      dy: (random() - 0.5) * driftRange,
      big: isBig,
      bucket: nearestIndex(size, isBig ? STARFIELD.bigSizes : STARFIELD.smallSizes),
    });
  }
  return stars;
}

/** Twinkle phase in [−1, 1] at `timeMs` (0 when the field is still). */
export function twinkle(star: Star, timeMs: number, still = false): number {
  return still ? 0 : Math.sin(timeMs * star.freq + star.phase);
}

/** Alpha of a star for a twinkle phase. */
export function starAlpha(star: Star, phase: number): number {
  const min = star.big ? STARFIELD.alphaMinBig : STARFIELD.alphaMinSmall;
  return Math.min(
    STARFIELD.alphaMax,
    Math.max(min, star.base + phase * STARFIELD.twinkleAmplitude),
  );
}

/** Atlas level (0…levels−1) for a twinkle phase. */
export function starLevel(phase: number): number {
  return Math.round(((phase + 1) / 2) * (STARFIELD.levels - 1));
}

/** Position (CSS px, top-left of the field) of a star at `timeMs` on a `width`×`height` field. */
export function starPosition(
  star: Star,
  timeMs: number,
  width: number,
  height: number,
  still = false,
): [number, number] {
  const seconds = still ? 0 : timeMs / 1000;
  const w = width + STARFIELD.wrapMargin;
  const h = height + STARFIELD.wrapMargin;
  let x = (star.rx * w + star.dx * seconds) % w;
  let y = (star.ry * h + star.dy * seconds) % h;
  if (x < 0) x += w;
  if (y < 0) y += h;
  return [x - STARFIELD.wrapMargin / 2, y - STARFIELD.wrapMargin / 2];
}

/** Device pixel ratio the canvas renders at for a viewport `width`. */
export function starfieldDpr(devicePixelRatio: number, width: number): number {
  const cap = width < STARFIELD.narrowBelow ? STARFIELD.dprCapNarrow : STARFIELD.dprCap;
  return Math.min(devicePixelRatio || 1, cap);
}

/** Interval between canvas frames (ms). */
export const STARFIELD_FRAME_MS = 1000 / STARFIELD.fps;

/** True when a frame at `now` is due after the previous one at `last` (2 ms of rAF jitter allowed). */
export function frameDue(now: number, last: number): boolean {
  return now - last >= STARFIELD_FRAME_MS - 2;
}

export interface MeteorPlan {
  /** Streak length (px): the element's width. */
  length: number;
  durationMs: number;
  from: [number, number];
  to: [number, number];
}

/** One shooting star on a `width`×`height` viewport. */
export function planMeteor(random: () => number, width: number, height: number): MeteorPlan {
  const angle = (METEOR.angleDeg * Math.PI) / 180;
  const speed = METEOR.speedMin + random() * (METEOR.speedMax - METEOR.speedMin);
  const length = METEOR.lengthMin + random() * (METEOR.lengthMax - METEOR.lengthMin);
  const frames = METEOR.framesMin + random() * (METEOR.framesMax - METEOR.framesMin);
  const x = random() * width * METEOR.spawnWidth;
  const y = random() * height * METEOR.spawnHeight;
  return {
    length,
    durationMs: frames * METEOR.frameMs,
    from: [x, y],
    to: [x + Math.cos(angle) * speed * frames, y + Math.sin(angle) * speed * frames],
  };
}

/** WAAPI keyframes of a shooting star (linear; EF-10). */
export function meteorKeyframes(plan: MeteorPlan): Keyframe[] {
  const at = (p: number) => {
    const x = plan.from[0] + (plan.to[0] - plan.from[0]) * p;
    const y = plan.from[1] + (plan.to[1] - plan.from[1]) * p;
    return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${METEOR.angleDeg}deg)`;
  };
  return [
    { offset: 0, transform: at(0), opacity: 0 },
    { offset: METEOR.fadeIn, transform: at(METEOR.fadeIn), opacity: 1 },
    { offset: METEOR.fadeOut, transform: at(METEOR.fadeOut), opacity: 1 },
    { offset: 1, transform: at(1), opacity: 0 },
  ];
}

/** Pause (ms) before the next shooting star. */
export function meteorPauseMs(random: () => number): number {
  return random() * METEOR.pauseMaxFrames * METEOR.frameMs;
}
