import { describe, expect, it } from 'vitest';
import {
  METEOR,
  STARFIELD,
  STARFIELD_FRAME_MS,
  createRandom,
  createStars,
  frameDue,
  meteorKeyframes,
  meteorPauseMs,
  nearestIndex,
  planMeteor,
  starAlpha,
  starLevel,
  starPosition,
  starfieldDpr,
  twinkle,
} from './starfield';

describe('star layout (EF-09)', () => {
  const stars = createStars();

  it('is deterministic and has 300 + 70 stars', () => {
    expect(stars).toHaveLength(370);
    expect(createStars()).toEqual(stars);
    expect(stars.filter((s) => s.big)).toHaveLength(70);
    expect(stars.slice(0, 300).every((s) => !s.big)).toBe(true);
  });

  it('keeps every parameter in its measured range', () => {
    const maxDrift = ((5 / 200) * STARFIELD.driftSpeed * 60) / 2;
    for (const star of stars) {
      expect(star.rx).toBeGreaterThanOrEqual(0);
      expect(star.rx).toBeLessThan(1);
      expect(star.freq).toBeGreaterThanOrEqual(0.002 / 2);
      expect(star.freq).toBeLessThanOrEqual(0.014 / 2);
      expect(Math.abs(star.dx)).toBeLessThanOrEqual(maxDrift);
      const sizes = star.big ? STARFIELD.bigSizes : STARFIELD.smallSizes;
      expect(star.bucket).toBeLessThan(sizes.length);
      expect(star.base).toBeLessThanOrEqual(star.big ? 1 : 0.7);
      expect(star.base).toBeGreaterThanOrEqual(star.big ? 0.7 : 0.49);
    }
  });

  it('uses every size bucket', () => {
    const small = new Set(stars.filter((s) => !s.big).map((s) => s.bucket));
    const big = new Set(stars.filter((s) => s.big).map((s) => s.bucket));
    expect(small.size).toBe(STARFIELD.smallSizes.length);
    expect(big.size).toBe(STARFIELD.bigSizes.length);
  });

  it('random generator stays in [0, 1)', () => {
    const random = createRandom(1);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('finds the nearest bucket', () => {
    expect(nearestIndex(0.2, STARFIELD.smallSizes)).toBe(0);
    expect(nearestIndex(0.61, STARFIELD.smallSizes)).toBe(2);
    expect(nearestIndex(3.5, STARFIELD.bigSizes)).toBe(4);
  });
});

describe('star frame (EF-09)', () => {
  const [star] = createStars(1, 0);

  it('twinkles between the clamps and freezes when still', () => {
    expect(twinkle(star, 12_345, true)).toBe(0);
    expect(starAlpha(star, 1)).toBeLessThanOrEqual(STARFIELD.alphaMax);
    expect(starAlpha({ ...star, base: 0 }, -1)).toBe(STARFIELD.alphaMinSmall);
    expect(starAlpha({ ...star, base: 0, big: true }, -1)).toBe(STARFIELD.alphaMinBig);
    expect(starLevel(-1)).toBe(0);
    expect(starLevel(1)).toBe(STARFIELD.levels - 1);
    expect(starLevel(0)).toBe(6);
  });

  it('drifts and wraps inside the field', () => {
    const still = starPosition(star, 99_999, 1440, 900, true);
    expect(still[0]).toBeCloseTo(star.rx * 1444 - 2, 6);
    for (const t of [0, 1e4, 1e6, 1e8]) {
      const [x, y] = starPosition(star, t, 1440, 900);
      expect(x).toBeGreaterThanOrEqual(-2);
      expect(x).toBeLessThan(1442);
      expect(y).toBeGreaterThanOrEqual(-2);
      expect(y).toBeLessThan(902);
    }
    const [x0] = starPosition(star, 0, 1440, 900);
    const [x1] = starPosition(star, 1000, 1440, 900);
    const moved = (((x1 - x0) % 1444) + 1444) % 1444;
    expect(Math.min(moved, 1444 - moved)).toBeCloseTo(Math.abs(star.dx), 6);
  });

  it('caps the pixel ratio and paces at 24 fps', () => {
    expect(starfieldDpr(3, 1440)).toBe(1.5);
    expect(starfieldDpr(3, 390)).toBe(1.25);
    expect(starfieldDpr(1, 390)).toBe(1);
    expect(STARFIELD_FRAME_MS).toBeCloseTo(41.67, 2);
    expect(frameDue(1000, 1000 - 16.7)).toBe(false);
    expect(frameDue(1000, 1000 - 40)).toBe(true);
  });
});

describe('shooting star (EF-10)', () => {
  it('stays in its measured ranges', () => {
    const random = createRandom(7);
    for (let i = 0; i < 200; i++) {
      const plan = planMeteor(random, 1440, 900);
      expect(plan.length).toBeGreaterThanOrEqual(100);
      expect(plan.length).toBeLessThan(200);
      expect(plan.durationMs).toBeGreaterThanOrEqual((50 / 60) * 1000);
      expect(plan.durationMs).toBeLessThan((140 / 60) * 1000);
      expect(plan.from[0]).toBeLessThan(1440 * 0.8);
      expect(plan.from[1]).toBeLessThan(900 * 0.45);
      // 45°: equal travel on both axes.
      expect(plan.to[0] - plan.from[0]).toBeCloseTo(plan.to[1] - plan.from[1], 6);
      expect(meteorPauseMs(random)).toBeLessThan((METEOR.pauseMaxFrames / 60) * 1000);
    }
  });

  it('fades in by 15 %, holds to 65 % and fades out', () => {
    const frames = meteorKeyframes({ length: 150, durationMs: 1000, from: [0, 0], to: [100, 100] });
    expect(frames.map((f) => f.offset)).toEqual([0, 0.15, 0.65, 1]);
    expect(frames.map((f) => f.opacity)).toEqual([0, 1, 1, 0]);
    expect(frames[1].transform).toBe('translate(15.00px, 15.00px) rotate(45deg)');
  });
});
