import { describe, expect, it } from 'vitest';
import { ABOUT_EXPERIENCE_REVEAL, APPEAR_PRESETS } from '@/components/motion/presets';
import { revealFrame, revealState, revealThresholds } from './in-view-reveal';

const { threshold } = ABOUT_EXPERIENCE_REVEAL;

describe('revealState', () => {
  it('enters only when intersecting at or above the threshold', () => {
    expect(revealState({ isIntersecting: true, intersectionRatio: 0.35 }, threshold, false)).toBe(
      'in',
    );
    expect(revealState({ isIntersecting: true, intersectionRatio: 0.9 }, threshold, false)).toBe(
      'in',
    );
    expect(revealState({ isIntersecting: true, intersectionRatio: 0.2 }, threshold, false)).toBe(
      'out',
    );
  });

  it('leaves when it drops below the threshold or stops intersecting', () => {
    expect(revealState({ isIntersecting: false, intersectionRatio: 0 }, threshold, false)).toBe(
      'out',
    );
    expect(revealState({ isIntersecting: false, intersectionRatio: 0.5 }, threshold, false)).toBe(
      'out',
    );
  });

  it('never hides with reduced motion', () => {
    expect(revealState({ isIntersecting: false, intersectionRatio: 0 }, threshold, true)).toBe(
      'in',
    );
  });
});

describe('revealThresholds', () => {
  it('reports the threshold crossing and the edge', () => {
    expect(revealThresholds(0.35)).toEqual([0, 0.35]);
    expect(revealThresholds(0)).toEqual([0]);
  });
});

describe('revealFrame', () => {
  it('reads the end values of the Experience presets', () => {
    const text = APPEAR_PRESETS[ABOUT_EXPERIENCE_REVEAL.slots.title.preset];
    expect(revealFrame(text, 'in')).toEqual({ opacity: 1, translate: '0px 0px' });
    expect(revealFrame(text, 'out')).toEqual({ opacity: 0, translate: '0px 8px' });
    const date = APPEAR_PRESETS[ABOUT_EXPERIENCE_REVEAL.slots.date.preset];
    expect(revealFrame(date, 'in').opacity).toBe(0.4);
  });

  it('is reversible and once is off', () => {
    expect(ABOUT_EXPERIENCE_REVEAL.once).toBe(false);
  });
});
