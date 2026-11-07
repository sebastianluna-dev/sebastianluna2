import { describe, expect, it } from 'vitest';
import { CHROME_SPRINGS } from '@/components/motion/presets';
import {
  createSpring,
  createVelocityTracker,
  stepSpring,
  tween,
  type FrameScheduler,
} from './spring';
import { resolveSpring, springSolution } from './spring-to-linear';

/** Deterministic vsync clock: frames land on multiples of `frameMs`; it starts at `startMs`. */
function fakeClock(frameMs = 1000 / 60, startMs = 0) {
  let now = startMs;
  let nextId = 1;
  const queue = new Map<number, (t: number) => void>();
  const scheduler: FrameScheduler = {
    now: () => now,
    request(cb) {
      const id = nextId++;
      queue.set(id, cb);
      return id;
    },
    cancel(id) {
      queue.delete(id);
    },
  };
  return {
    scheduler,
    now: () => now,
    frame() {
      now = (Math.floor(now / frameMs + 1e-9) + 1) * frameMs;
      const callbacks = [...queue.values()];
      queue.clear();
      for (const cb of callbacks) cb(now);
    },
    run(maxFrames = 600) {
      for (let i = 0; i < maxFrames && queue.size; i++) this.frame();
    },
    pending: () => queue.size,
  };
}

const notReduced = () => false;

describe('stepSpring', () => {
  it('is exact for any dt: ten small steps equal one big one', () => {
    for (const { stiffness, damping, mass } of [
      CHROME_SPRINGS.ropeY,
      CHROME_SPRINGS.navActive,
      { stiffness: 532.85, damping: 2 * Math.sqrt(532.85), mass: 1 },
    ]) {
      let [x, v] = [40, -300];
      for (let i = 0; i < 10; i++) [x, v] = stepSpring(x, v, 0.005, stiffness, damping, mass);
      const [bx, bv] = stepSpring(40, -300, 0.05, stiffness, damping, mass);
      expect(x).toBeCloseTo(bx, 9);
      expect(v).toBeCloseTo(bv, 7);
    }
  });

  it('matches the closed-form solution used by spring-to-linear', () => {
    const spec = CHROME_SPRINGS.ropeY;
    const sol = springSolution(resolveSpring(spec), 72.36, 0, 0);
    const [x, v] = stepSpring(72.36, 0, 0.1, spec.stiffness, spec.damping, spec.mass);
    expect(x).toBeCloseTo(sol.position(100), 9);
    expect(v).toBeCloseTo(sol.velocity(100), 7);
  });
});

describe('createSpring', () => {
  it('converges to the target and resolves finished()', async () => {
    const clock = fakeClock();
    const values: number[] = [];
    const spring = createSpring(4, CHROME_SPRINGS.navActive, (v) => values.push(v), {
      scheduler: clock.scheduler,
      reducedMotion: notReduced,
    });
    spring.set(147);
    const done = spring.finished();
    clock.run();
    await done;
    expect(spring.get()).toBe(147);
    expect(spring.velocity()).toBe(0);
    expect(spring.isAnimating()).toBe(false);
    expect(values.at(-1)).toBe(147);
    // ζ 1.06: no overshoot, rest under ~330 ms (hueco-6 §5: 318 ms analytic).
    expect(Math.max(...values)).toBeLessThanOrEqual(147);
    expect(values.length * (1000 / 60)).toBeLessThan(600);
  });

  it('keeps the velocity when retargeted mid-flight', () => {
    const clock = fakeClock();
    const spring = createSpring(0, CHROME_SPRINGS.navHover, () => {}, {
      scheduler: clock.scheduler,
      reducedMotion: notReduced,
    });
    spring.set(100);
    for (let i = 0; i < 4; i++) clock.frame();
    const before = spring.velocity();
    expect(before).toBeGreaterThan(0);
    spring.set(-50);
    expect(spring.velocity()).toBe(before);
    clock.frame();
    // Still moving forward on the first frame after the retarget: momentum carried over.
    expect(spring.velocity()).toBeLessThan(before);
    clock.run();
    expect(spring.get()).toBe(-50);
  });

  it('jumps with reduced motion or { jump: true }', () => {
    const clock = fakeClock();
    let last = NaN;
    const spring = createSpring(0, CHROME_SPRINGS.ropeY, (v) => (last = v), {
      scheduler: clock.scheduler,
      reducedMotion: () => true,
    });
    spring.set(30);
    expect(last).toBe(30);
    expect(clock.pending()).toBe(0);
    const other = createSpring(0, CHROME_SPRINGS.ropeY, (v) => (last = v), {
      scheduler: clock.scheduler,
      reducedMotion: notReduced,
    });
    other.set(12, { jump: true });
    expect(last).toBe(12);
    expect(other.isAnimating()).toBe(false);
  });

  it('rope release overshoots −4.99 px like the reference (TE-03, TE-04, TE-05)', () => {
    // Analytic trajectory from 72.36 px at rest: −4.99 px at ≈228 ms (hueco-6 §5; original −4.99).
    const spec = CHROME_SPRINGS.ropeY;
    const sol = springSolution(resolveSpring(spec), 72.36, 0, 0);
    let min = 0;
    let tMin = 0;
    for (let t = 0; t <= 600; t += 0.25) {
      const y = sol.position(t);
      if (y < min) [min, tMin] = [y, t];
    }
    expect(min.toFixed(2)).toBe('-4.99');
    expect(tMin).toBeGreaterThan(225);
    expect(tMin).toBeLessThan(230);

    // Frame-sampled at 60 Hz over every phase: the deepest frame reads −4.98/−4.99 (bench: −4.98).
    let deepest = 0;
    for (let phase = 0; phase < 16; phase++) {
      const clock = fakeClock(1000 / 60, (phase * 1000) / 60 / 16);
      let seen = 0;
      const rope = createSpring(72.36, spec, (y) => (seen = Math.min(seen, y)), {
        scheduler: clock.scheduler,
        reducedMotion: notReduced,
      });
      // Released `phase` sixteenths into a 60 Hz slot: the first frame integrates the rest of it.
      rope.set(0);
      clock.run();
      expect(seen).toBeGreaterThanOrEqual(-4.99);
      expect(seen).toBeLessThan(-4.9);
      deepest = Math.min(deepest, seen);
    }
    expect(Math.round(deepest * 100) / 100).toBeGreaterThanOrEqual(-4.99);
    expect(Math.round(deepest * 100) / 100).toBeLessThanOrEqual(-4.98);
  });

  it('inherits the pointer velocity on release', () => {
    const clock = fakeClock();
    let seen = 0;
    const rope = createSpring(72.36, CHROME_SPRINGS.ropeY, (y) => (seen = Math.min(seen, y)), {
      scheduler: clock.scheduler,
      reducedMotion: notReduced,
    });
    rope.set(0, { velocity: -400 });
    clock.run();
    // A downward flick deepens the overshoot beyond the −4.96 px of a release at rest (same frames).
    expect(seen).toBeLessThan(-5.2);
  });
});

describe('createVelocityTracker', () => {
  it('measures units per second and forgets stale samples', () => {
    let now = 0;
    const tracker = createVelocityTracker(() => now);
    for (const [t, y] of [
      [0, 0],
      [10, 5],
      [20, 10],
      [30, 15],
    ]) {
      now = t;
      tracker.push(y);
    }
    expect(tracker.get()).toBeCloseTo(500, 6);
    now = 100;
    expect(tracker.get()).toBe(0);
  });
});

describe('tween', () => {
  it('eases to the target over its duration', async () => {
    const clock = fakeClock();
    const values: number[] = [];
    const t = tween(
      0,
      30,
      140,
      (p) => 1 - (1 - p) ** 2,
      (v) => values.push(v),
      {
        scheduler: clock.scheduler,
        reducedMotion: notReduced,
      },
    );
    clock.run();
    await t.finished;
    expect(values.at(-1)).toBe(30);
    expect(values.length).toBe(9);
  });

  it('jumps with reduced motion', () => {
    let last = 0;
    tween(
      0,
      30,
      140,
      (p) => p,
      (v) => (last = v),
      { reducedMotion: () => true },
    );
    expect(last).toBe(30);
  });
});
