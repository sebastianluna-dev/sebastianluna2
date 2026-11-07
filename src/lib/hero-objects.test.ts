import { describe, expect, it } from 'vitest';
import {
  IDENTITY_TRANSFORM,
  bumpCeiling,
  bumpDurationMs,
  bumpKeyframes,
  bumpStrength,
  createPointerSample,
  initialQueue,
  pickNextObject,
  planBump,
  preloadCandidates,
  shuffle,
  stepPointerSample,
} from './hero-objects';

/** Deterministic `Math.random` stand-in. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('pointer speed (HE-20)', () => {
  it('blends .35 of the previous speed with .65 of the new step', () => {
    const sample = createPointerSample();
    stepPointerSample(sample, 0, 0, 1000);
    expect(sample.vx).toBe(0);
    stepPointerSample(sample, 16, 0, 1016);
    expect(sample.vx).toBeCloseTo(650, 6);
    stepPointerSample(sample, 32, 0, 1032);
    expect(sample.vx).toBeCloseTo(0.35 * 650 + 650, 6);
  });

  it('never divides by less than 8 ms', () => {
    const sample = createPointerSample();
    stepPointerSample(sample, 0, 0, 1000);
    stepPointerSample(sample, 8, 0, 1002);
    expect(sample.vx).toBeCloseTo(650, 6);
  });
});

describe('bump strength (HE-20, hueco-2)', () => {
  it('reaches full strength at 3300 px/s with sensitivity 5', () => {
    expect(bumpCeiling()).toBe(3300);
    expect(bumpStrength(3300)).toBe(1);
    expect(bumpStrength(5000)).toBe(1);
  });

  it('has an effective threshold of 812 px/s (806 without, 813 with)', () => {
    expect(bumpStrength(259)).toBe(0);
    expect(bumpStrength(500)).toBe(0);
    expect(bumpStrength(806)).toBe(0);
    expect(bumpStrength(811)).toBe(0);
    expect(bumpStrength(813)).toBeGreaterThanOrEqual(0.055);
    expect(bumpStrength(813)).toBeCloseTo(0.0552, 3);
  });

  it('keeps the curve from 260, not from 812 (peak of ~3150 px/s)', () => {
    const m = bumpStrength(3150);
    expect(m).toBeCloseTo(0.918, 2);
    expect(1 + 0.025 * m).toBeCloseTo(1.0229, 3);
  });

  it('lasts 225 ms with inertia .75', () => {
    expect(bumpDurationMs()).toBe(225);
    expect(bumpDurationMs(10)).toBe(242);
  });
});

describe('planBump', () => {
  function fastSample(vx: number, vy: number, time = 1000) {
    return { x: 0, y: 0, time, vx, vy };
  }

  it('skips stale moves and slow pointers', () => {
    expect(planBump(createPointerSample(), 1000, 0.5, 0.5)).toBeNull();
    expect(planBump(fastSample(3000, 0), 1141, 0.5, 0.5)).toBeNull();
    expect(planBump(fastSample(700, 0), 1010, 0.5, 0.5)).toBeNull();
  });

  it('pushes along the pointer direction and tilts by the entry point', () => {
    const plan = planBump(fastSample(3300, 0), 1010, 0, 0);
    expect(plan).not.toBeNull();
    // Rightwards, entering at the top-left corner: x +8, y 0, rotate (−1·0 − (−1)·1)·2.5 = 2.5°.
    expect(plan?.peak).toBe('translate3d(8px, 0px, 0px) rotate(2.5deg) scale(1.025)');
    expect(plan?.durationMs).toBe(225);
  });

  it('builds the reference keyframes from the current transform', () => {
    const frames = bumpKeyframes('none', 'P');
    expect(frames).toHaveLength(3);
    expect(frames[1]).toMatchObject({ transform: 'P', offset: 0.36 });
    expect(frames[2]).toMatchObject({ transform: IDENTITY_TRANSFORM, offset: 1 });
  });
});

describe('object pool (HE-21)', () => {
  const pool = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

  it('shuffles without losing items', () => {
    const out = shuffle(pool, seeded(3));
    expect([...out].sort()).toEqual(pool);
    expect(out).not.toBe(pool);
  });

  it('starts a queue without the current object', () => {
    const queue = initialQueue('c', pool, seeded(7));
    expect(queue).toHaveLength(pool.length - 1);
    expect(queue).not.toContain('c');
  });

  it('pops a free object and keeps the rest', () => {
    const pick = pickNextObject('a', ['b', 'c', 'd'], new Set(['d']), pool);
    expect(pick.next).toBe('c');
    expect(pick.remaining).toEqual(['b']);
  });

  it('reshuffles the pool when the queue has nothing free', () => {
    const visible = new Set(['b', 'c', 'd', 'e']);
    const pick = pickNextObject('a', ['b'], visible, pool, seeded(11));
    expect(['f', 'g']).toContain(pick.next);
    expect(pick.remaining).toHaveLength(1);
  });

  it('stays put when every other object is visible', () => {
    const pick = pickNextObject('a', [], new Set(['b', 'c', 'd', 'e', 'f', 'g']), pool);
    expect(pick.next).toBe('a');
  });

  it('never repeats until the queue is spent', () => {
    let current = 'a';
    let queue = initialQueue(current, pool, seeded(5));
    const seen: string[] = [];
    for (let i = 0; i < pool.length - 1; i += 1) {
      const pick = pickNextObject(current, queue, new Set(), pool);
      seen.push(pick.next);
      current = pick.next;
      queue = pick.remaining;
    }
    expect(new Set(seen).size).toBe(pool.length - 1);
  });

  it('preloads the last free candidates of the queue', () => {
    expect(preloadCandidates(['b', 'c', 'd', 'e'], new Set(['e']))).toEqual(['c', 'd']);
  });
});
