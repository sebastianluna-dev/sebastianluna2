import { describe, expect, it } from 'vitest';
import { APPEAR_PRESETS, SPRING_TIMINGS, SPRING_TIMING_SOURCES } from '@/components/motion/presets';
import {
  cubicBezier,
  resolveSpring,
  springDurationMs,
  springSolution,
  springToCubicBezier,
  springToLinear,
  type SpringSpec,
} from './spring-to-linear';

/**
 * Reference chains: what motion 14.10.1 and the reference site produce, measured with
 * `getAnimations()` (recon/motion-json/live-*.json, recon/motion-chains/node.json `chain14`,
 * recon/hueco-1). Chromium serialises them with offsets; these are the offset-free strings.
 */
const REFERENCE = {
  reveal: {
    spec: { bounce: 0, duration: 0.4 },
    durationMs: 400,
    chain:
      'linear(0, 0.024, 0.0823, 0.1594, 0.2448, 0.3315, 0.4152, 0.4934, 0.5646, 0.6282, 0.6844, 0.7334, 0.7758, 0.8122, 0.8432, 0.8694, 0.8916, 0.9102, 0.9258, 0.9388, 0.9496, 0.9586, 0.966, 0.9722, 0.9772, 0.9814, 0.9848, 0.9876, 0.9899, 0.9918, 0.9933, 0.9946, 0.9956, 0.9964, 0.9971, 0.9977, 0.9981, 0.9985, 0.9988, 1)',
  },
  S1: {
    spec: { bounce: 0.12, duration: 0.46 },
    durationMs: 500,
    chain:
      'linear(0, 0.0161, 0.0576, 0.1161, 0.1849, 0.2591, 0.3348, 0.4093, 0.4807, 0.5476, 0.6094, 0.6655, 0.7159, 0.7607, 0.8, 0.8343, 0.8639, 0.8893, 0.9108, 0.9289, 0.9441, 0.9567, 0.967, 0.9754, 0.9821, 0.9875, 0.9918, 0.9951, 0.9976, 0.9994, 1.0008, 1.0017, 1.0024, 1.0027, 1.0029, 1.003, 1.0029, 1.0028, 1.0026, 1.0024, 1.0022, 1.0019, 1.0017, 1.0015, 1.0013, 1.0011, 1, 1, 1, 1)',
  },
  S2: {
    spec: { bounce: 0.2, duration: 0.28 },
    durationMs: 300,
    chain:
      'linear(0, 0.0462, 0.1543, 0.2896, 0.4294, 0.5599, 0.674, 0.7687, 0.844, 0.9014, 0.9436, 0.9731, 0.9928, 1.0049, 1.0117, 1.0146, 1.0151, 1.0141, 1.0123, 1.0103, 1.0082, 1.0062, 1.0046, 1.0032, 1.0021, 1.0013, 1.0007, 1.0003, 1, 1)',
  },
  cardIn: {
    spec: { stiffness: 500, damping: 60, mass: 1 },
    durationMs: 650,
    chain:
      'linear(0, 0.0212, 0.0703, 0.1328, 0.2001, 0.2675, 0.3323, 0.3932, 0.4496, 0.5015, 0.5488, 0.5919, 0.6311, 0.6665, 0.6986, 0.7277, 0.7539, 0.7777, 0.7991, 0.8185, 0.836, 0.8519, 0.8662, 0.8791, 0.8908, 0.9013, 0.9109, 0.9195, 0.9272, 0.9343, 0.9406, 0.9464, 0.9515, 0.9562, 0.9604, 0.9643, 0.9677, 0.9708, 0.9736, 0.9762, 0.9785, 0.9806, 0.9824, 0.9841, 0.9857, 0.9871, 0.9883, 0.9894, 0.9905, 0.9914, 0.9922, 0.993, 0.9936, 0.9943, 0.9948, 0.9953, 0.9958, 0.9962, 0.9965, 0.9969, 0.9972, 0.9975, 0.9977, 0.9979, 1)',
  },
} satisfies Record<string, { spec: SpringSpec; durationMs: number; chain: string }>;

describe('springToLinear reproduces the measured chains', () => {
  for (const [id, ref] of Object.entries(REFERENCE)) {
    it(`${id}: exact string and duration`, () => {
      const result = springToLinear(ref.spec);
      expect(result.easing).toBe(ref.chain);
      expect(result.durationMs).toBe(ref.durationMs);
      expect(result.points).toHaveLength(ref.durationMs / 10);
    });
  }

  it('solves the physics of the duration springs (animation-inventory §2)', () => {
    const reveal = resolveSpring(REFERENCE.reveal.spec);
    expect(reveal.stiffness).toBeCloseTo(532.85, 2);
    expect(reveal.damping).toBeCloseTo(46.167, 3);
    expect(reveal.dampingRatio).toBe(1);
    const s1 = resolveSpring(REFERENCE.S1.spec);
    expect(s1.stiffness).toBeCloseTo(345.513, 3);
    expect(s1.damping).toBeCloseTo(32.715, 3);
    expect(s1.durationMs).toBe(460);
    const s2 = resolveSpring(REFERENCE.S2.spec);
    expect(s2.stiffness).toBeCloseTo(1031.85, 2);
    expect(s2.damping).toBeCloseTo(51.396, 3);
    expect(s2.durationMs).toBe(280);
  });

  it('cuts {bounce, duration} to 1 at t ≥ raw duration, not at the 50 ms step', () => {
    const { points } = springToLinear(REFERENCE.S1.spec);
    // Node 45 sits at 459.2 ms (still 1.0011); node 46 at 469.4 ms is already 1.
    expect(points[45]).toBe(1.0011);
    expect(points.slice(46)).toEqual([1, 1, 1, 1]);
  });

  it('cardIn settles at 650 ms because the over-damped velocity is analytic (hueco-1)', () => {
    const spring = resolveSpring(REFERENCE.cardIn.spec);
    expect(spring.dampingRatio).toBeCloseTo(1.3416, 4);
    const sol = springSolution(spring, 0, 100);
    expect(sol.velocity(600)).toBeCloseTo(3.0984, 3);
    expect(sol.velocity(650)).toBeCloseTo(1.8793, 3);
    expect(springDurationMs(REFERENCE.cardIn.spec)).toBe(650);
  });
});

describe('springSolution', () => {
  const regimes: Record<string, SpringSpec> = {
    under: { stiffness: 280, damping: 20, mass: 0.85 },
    critical: { bounce: 0, duration: 0.4 },
    over: { stiffness: 500, damping: 60, mass: 1 },
  };
  for (const [name, spec] of Object.entries(regimes)) {
    it(`${name}-damped: velocity is the derivative of position`, () => {
      const sol = springSolution(resolveSpring(spec), 20, 0, -150);
      expect(sol.position(0)).toBeCloseTo(20, 10);
      expect(sol.velocity(0)).toBeCloseTo(-150, 8);
      for (const t of [5, 50, 120, 300]) {
        const h = 1e-3;
        const numeric = ((sol.position(t + h) - sol.position(t - h)) / (2 * h)) * 1000;
        expect(sol.velocity(t)).toBeCloseTo(numeric, 3);
      }
      expect(Math.abs(sol.position(5000))).toBeLessThan(1e-6);
    });
  }
});

describe('presets carry the generator output (no drift)', () => {
  for (const [id, source] of Object.entries(SPRING_TIMING_SOURCES)) {
    it(`${id}`, () => {
      const timing = SPRING_TIMINGS[id as keyof typeof SPRING_TIMINGS];
      const linear = springToLinear(source);
      expect(timing.easing).toBe(linear.easing);
      expect(timing.durationMs).toBe(linear.durationMs);
      expect(timing.fallbackEasing).toBe(springToCubicBezier(source).easing);
    });
  }

  it('cardIn lasts 650 ms', () => {
    expect(APPEAR_PRESETS.cardIn.timing.durationMs).toBe(650);
  });
});

describe('cubic-bezier fallback', () => {
  it('evaluates CSS cubic-bezier curves', () => {
    const linear = cubicBezier([0, 0, 1, 1]);
    expect(linear(0.3)).toBeCloseTo(0.3, 6);
    const ease = cubicBezier([0.25, 0.1, 0.25, 1]);
    expect(ease(0.5)).toBeCloseTo(0.8024, 3);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('fits each page spring within .05 of the exact curve', () => {
    for (const source of Object.values(SPRING_TIMING_SOURCES)) {
      const fit = springToCubicBezier(source);
      expect(fit.maxError).toBeLessThan(0.05);
      expect(fit.points[0]).toBeGreaterThanOrEqual(0);
      expect(fit.points[2]).toBeLessThanOrEqual(1);
    }
  });
});
