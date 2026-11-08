import { describe, expect, it } from 'vitest';
import { FOOTER_SCENE } from '@/components/motion/presets';
import { sceneShowsEnough, socialEntranceDelay } from './footer-scene';

describe('sceneShowsEnough (SH-09)', () => {
  const rect = (top: number, height: number, width = 1000) => ({
    top,
    bottom: top + height,
    width,
    height,
  });

  it('needs min(55 % of the stage, 35 % of the viewport) on screen', () => {
    // 400 px stage in a 900 px viewport: threshold min(220, 315) = 220.
    expect(sceneShowsEnough(rect(900 - 219, 400), 900)).toBe(false);
    expect(sceneShowsEnough(rect(900 - 221, 400), 900)).toBe(true);
    // 700 px stage in a 500 px viewport: threshold min(385, 175) = 175.
    expect(sceneShowsEnough(rect(500 - 174, 700), 500)).toBe(false);
    expect(sceneShowsEnough(rect(500 - 176, 700), 500)).toBe(true);
  });

  it('counts only the part inside the viewport', () => {
    expect(sceneShowsEnough(rect(-380, 400), 900)).toBe(false);
    expect(sceneShowsEnough(rect(-100, 400), 900)).toBe(true);
  });

  it('never fires for a box without width (hidden stage)', () => {
    expect(sceneShowsEnough(rect(0, 400, 0), 900)).toBe(false);
  });
});

describe('socialEntranceDelay (SH-16)', () => {
  const { startMs, stepMs, durationMs } = FOOTER_SCENE.socials;

  it('staggers the buttons from 1000 ms in steps of 100, right after the name', () => {
    expect([0, 1, 2, 3].map((i) => socialEntranceDelay(i, 0))).toEqual([1000, 1100, 1200, 1300]);
    expect(startMs).toBe(1000);
    const { nameScale } = FOOTER_SCENE;
    expect(startMs).toBeGreaterThanOrEqual(nameScale.delayMs + nameScale.durationMs);
    expect(stepMs).toBe(100);
  });

  it('resumes mid-flight with a negative delay', () => {
    expect(socialEntranceDelay(0, startMs + 200)).toBe(-200);
    expect(socialEntranceDelay(1, startMs + 200)).toBe(stepMs - 200);
  });

  it('returns null once the entrance would be over', () => {
    expect(socialEntranceDelay(0, startMs + durationMs - 1)).toBe(-(durationMs - 1));
    expect(socialEntranceDelay(0, startMs + durationMs)).toBeNull();
  });

  it('treats a negative elapsed time as the start', () => {
    expect(socialEntranceDelay(0, -500)).toBe(startMs);
  });
});
