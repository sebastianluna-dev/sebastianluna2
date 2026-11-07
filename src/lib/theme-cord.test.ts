import { describe, expect, it } from 'vitest';
import {
  CORD,
  cordAngle,
  cordPath,
  cordX,
  cordY,
  crossesThreshold,
  flingDone,
  flingOffset,
  releaseOutcome,
  touchIntent,
  tugTarget,
} from './theme-cord';

describe('cord geometry (TE-03)', () => {
  it('is linear up to .72·L and rubber-banded after it', () => {
    expect(cordY(-20)).toBe(0);
    expect(cordY(30)).toBe(30);
    expect(cordY(41.76)).toBeCloseTo(41.76, 6);
    // 120 px drag: 72.36 px (hueco-6 bench; the reference measured 72.7 with motion's sampling).
    expect(cordY(120)).toBeCloseTo(72.36, 2);
    // The rubber band never exceeds .72·L + 34.
    expect(cordY(10_000)).toBeLessThanOrEqual(CORD.pullDistance * CORD.linearRatio + CORD.rubber);
  });

  it('touch pull of 90 px lands where the reference did (67.5 px)', () => {
    expect(cordY(90)).toBeCloseTo(67.5, 0);
  });

  it('limits the sideways travel to ±36 px', () => {
    expect(cordX(0)).toBe(0);
    expect(cordX(1000)).toBeCloseTo(36, 6);
    expect(cordX(-1000)).toBeCloseTo(-36, 6);
    expect(cordX(10)).toBeCloseTo(36 * Math.tanh(10 / 36), 10);
  });

  it('rotates the handle along the cord', () => {
    expect(cordAngle(0, 0, 142)).toBe(-0);
    expect(cordAngle(36, 0, 142)).toBeCloseTo((-Math.atan2(36, 142) * 180) / Math.PI, 10);
    expect(cordAngle(-10, 20, 128)).toBeGreaterThan(0);
  });

  it('draws the cord from the anchor to just under the handle', () => {
    expect(cordPath(0, 0, 142)).toBe('M 24 0 L 24 144');
    expect(cordPath(0, 4, 142)).toBe('M 24 0 L 24 148'); // hover: 144 → 148 (estados.md §1.7)
    expect(cordPath(-3.333, 10.555, 128)).toBe('M 24 0 L 20.67 140.56');
  });
});

describe('cord gestures (TE-03…TE-05, decision 17)', () => {
  it('switches at 18 px and tugs to 30 px', () => {
    expect(crossesThreshold(17.99)).toBe(false);
    expect(crossesThreshold(18)).toBe(true);
    expect(tugTarget()).toBe(30);
  });

  it('classifies the release', () => {
    expect(releaseOutcome(0, 0, 3)).toBe('tap');
    expect(releaseOutcome(0, 4, 4)).toBe('tap');
    expect(releaseOutcome(0, 10, 2)).toBe('none');
    expect(releaseOutcome(0, 0, 20)).toBe('pull');
    // The hover drop counts towards the pull, as in the reference.
    expect(releaseOutcome(4, 0, 14)).toBe('pull');
    expect(releaseOutcome(0, 0, -30)).toBe('none');
  });

  it('yields an upward first move to the scroll', () => {
    expect(touchIntent(0, -6)).toBe('pending');
    expect(touchIntent(0, -7)).toBe('scroll');
    expect(touchIntent(3, -8)).toBe('scroll');
    expect(touchIntent(9, -8)).toBe('pull');
    expect(touchIntent(0, 7)).toBe('pull');
    expect(touchIntent(-8, 1)).toBe('pull');
  });

  it('decays the fling', () => {
    expect(flingOffset(1000, 0)).toBe(0);
    expect(flingOffset(1000, 10_000)).toBeCloseTo(CORD.flingTimeConstantMs, 3);
    expect(flingOffset(-1000, 10_000)).toBeCloseTo(-CORD.flingTimeConstantMs, 3);
    expect(flingDone(1000, 0)).toBe(false);
    expect(flingDone(1000, 3000)).toBe(true);
    expect(flingDone(0, 0)).toBe(true);
  });
});
