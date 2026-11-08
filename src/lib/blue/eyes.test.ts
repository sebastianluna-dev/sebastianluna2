import { describe, expect, it } from 'vitest';
import { BLUE_EYES } from '@/components/motion/presets';
import { gazeFrom, gazeStyle, planBlink } from './eyes';

const viewport = { width: 1440, height: 900 };
const center = { x: 1340, y: 800 };

describe('gazeFrom', () => {
  it('is zero with the pointer on the launcher', () => {
    expect(gazeFrom(center, center, viewport)).toEqual({ x: 0, y: 0 });
  });

  it('measures over half the viewport and clamps to the limit', () => {
    expect(gazeFrom({ x: 980, y: 575 }, center, viewport)).toEqual({ x: -0.5, y: -0.5 });
    expect(gazeFrom({ x: 0, y: 0 }, center, viewport)).toEqual({ x: -1, y: -1 });
    expect(gazeFrom({ x: 0, y: 0 }, center, viewport, 0.8)).toEqual({ x: -0.8, y: -0.8 });
  });

  it('survives an empty viewport', () => {
    const gaze = gazeFrom({ x: 10, y: 10 }, { x: 0, y: 0 }, { width: 0, height: 0 });
    expect(Number.isFinite(gaze.x) && Number.isFinite(gaze.y)).toBe(true);
  });
});

describe('gazeStyle', () => {
  it('is the identity at rest', () => {
    expect(gazeStyle({ x: 0, y: 0 }, BLUE_EYES.gaze)).toEqual({
      body: 'translate(0px, 0px) rotateY(0deg) rotateX(0deg)',
      eyes: '0px 0px',
    });
  });

  it('turns the figure and moves the eyes towards the pointer', () => {
    const { body, eyes } = gazeStyle({ x: -1, y: -1 }, BLUE_EYES.gaze);
    const { gaze } = BLUE_EYES;
    expect(body).toBe(
      `translate(${-gaze.body.x}px, ${-gaze.body.y}px) rotateY(${-gaze.body.tiltY}deg) rotateX(${gaze.body.tiltX}deg)`,
    );
    expect(eyes).toBe(`${-gaze.eyes.x}px ${-gaze.eyes.y}px`);
  });
});

describe('planBlink', () => {
  const { blink } = BLUE_EYES;

  it('waits, closes and opens within the timing', () => {
    const plan = planBlink(blink, () => 0.5);
    const [close, open] = plan.steps;
    expect(plan.steps).toHaveLength(2);
    expect(close).toBeGreaterThanOrEqual(blink.interval[0]);
    expect(close).toBeLessThanOrEqual(blink.interval[1]);
    expect(open! - close!).toBeGreaterThanOrEqual(blink.closed[0]);
    expect(open! - close!).toBeLessThanOrEqual(blink.closed[1]);
    expect(plan.next).toBe(open);
  });

  it('sometimes blinks twice', () => {
    const plan = planBlink(blink, () => 0);
    expect(plan.steps).toHaveLength(4);
    const [, open, again, reopen] = plan.steps as [number, number, number, number];
    expect(again - open).toBeGreaterThanOrEqual(blink.doubleGap[0]);
    expect(reopen - again).toBeGreaterThanOrEqual(blink.doubleClosed[0]);
    expect(plan.next).toBe(reopen);
  });

  it('keeps every step in order', () => {
    for (const r of [0, 0.1, 0.3, 0.6, 0.99]) {
      const { steps } = planBlink(blink, () => r);
      expect([...steps].sort((a, b) => a - b)).toEqual(steps);
    }
  });
});
