import { describe, expect, it } from 'vitest';
import { FOOTER_SCENE } from '@/components/motion/presets';
import {
  handTracks,
  headRiseKeyframes,
  sceneShowsEnough,
  socialEntranceDelay,
} from './footer-scene';

describe('sceneShowsEnough (SH-09)', () => {
  const rect = (top: number, height: number, width = 1000) => ({
    top,
    bottom: top + height,
    width,
    height,
  });

  it('needs min(55 % of the portrait, 35 % of the viewport) on screen', () => {
    // 400 px portrait in a 900 px viewport: threshold min(220, 315) = 220.
    expect(sceneShowsEnough(rect(900 - 219, 400), 900)).toBe(false);
    expect(sceneShowsEnough(rect(900 - 221, 400), 900)).toBe(true);
    // 700 px portrait in a 500 px viewport: threshold min(385, 175) = 175.
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

  it('staggers the buttons from 1950 ms in steps of 100', () => {
    expect([0, 1, 2, 3].map((i) => socialEntranceDelay(i, 0))).toEqual([1950, 2050, 2150, 2250]);
    expect(startMs).toBe(1950);
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

describe('headRiseKeyframes (SH-14)', () => {
  it('rises from .95/.58/.58 of the head height to −4 px and rest', () => {
    const frames = headRiseKeyframes(100);
    expect(frames.map((frame) => frame.translate)).toEqual([
      '0 95px',
      '0 58px',
      '0 58px',
      '0 -4px',
      '0 0px',
    ]);
    expect(frames.map((frame) => frame.offset)).toEqual([0, 0.22, 0.38, 0.72, 1]);
  });

  it('gives each segment its easing and leaves the last keyframe without one', () => {
    const frames = headRiseKeyframes(115.5);
    expect(frames[0]?.easing).toBe(FOOTER_SCENE.head.riseEasings[0]);
    expect(frames[1]?.easing).toBe('linear');
    expect(frames[4]?.easing).toBeUndefined();
    expect(frames[0]?.translate).toBe('0 109.73px');
  });
});

describe('handTracks (SH-15)', () => {
  it('fades in during the first 35 % of the grip and rises 16 → −2 → 0 px', () => {
    const [fade, grip, pull] = handTracks(0);
    expect(fade.keyframes.map((frame) => frame.opacity)).toEqual([0, 1]);
    expect(fade.timing).toEqual({ delay: 420, duration: 480 * 0.35 });
    expect(grip.keyframes.map((frame) => frame.translate)).toEqual(['0 16px', '0 -2px', '0 0px']);
    expect(grip.keyframes.map((frame) => frame.offset)).toEqual([0, 0.7, 1]);
    expect(grip.timing).toEqual({ delay: 420, duration: 480 });
    expect(pull.keyframes.map((frame) => frame.translate)).toEqual([
      '0 0px',
      '0 3px',
      '0 -1.5px',
      '0 0px',
    ]);
    expect(pull.timing).toEqual({ delay: 1000, duration: 700, fill: 'none' });
  });

  it('eases every segment and delays the second hand by 60 / 30 ms', () => {
    const [, grip, pull] = handTracks(1);
    expect(grip.keyframes.at(-1)?.easing).toBeUndefined();
    expect(grip.keyframes[0].easing).toBe(FOOTER_SCENE.hands.grip.easing);
    expect(grip.timing.delay).toBe(480);
    expect(pull.timing.delay).toBe(1030);
  });
});
