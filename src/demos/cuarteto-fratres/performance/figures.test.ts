import { describe, expect, it } from 'vitest';
import {
  axisShare,
  countUp,
  DISCARDED,
  easeOutCubic,
  formatFigure,
  LIGHTHOUSE,
  PAINT,
  WEIGHT,
} from './figures';

describe('easeOutCubic', () => {
  it('runs from 0 to 1 and clamps outside', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('never goes back', () => {
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const value = easeOutCubic(t);
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
  });
});

describe('countUp', () => {
  it('starts at zero and stays below the target on the way', () => {
    expect(countUp(2.61, 0)).toBe(0);
    expect(countUp(2.61, 0.5)).toBeLessThan(2.61);
  });

  it('ends on the exact figures of the record', () => {
    const cases: [number, number, string][] = [
      [PAINT.lcp.before, 2, '2.61'],
      [PAINT.lcp.after, 2, '1.32'],
      [PAINT.fcp.before, 2, '1.42'],
      [PAINT.fcp.after, 2, '0.79'],
      [WEIGHT.before, 0, '463'],
      [WEIGHT.after, 0, '139'],
      [WEIGHT.music, 0, '375'],
      [LIGHTHOUSE.performance, 0, '98'],
      [LIGHTHOUSE.seo, 0, '100'],
      [DISCARDED.fcp.inlined, 2, '0.56'],
      [DISCARDED.lcp.inlined, 2, '2.05'],
    ];
    for (const [target, decimals, shown] of cases) {
      expect(formatFigure(countUp(target, 1), decimals)).toBe(shown);
      expect(formatFigure(countUp(target, 1.4), decimals)).toBe(shown);
    }
  });
});

describe('axisShare', () => {
  it('keeps the bars to scale on an axis from zero', () => {
    expect(axisShare(PAINT.lcp.before, 3) / axisShare(PAINT.lcp.after, 3)).toBeCloseTo(2.61 / 1.32);
    expect(axisShare(600, 500)).toBe(1);
    expect(axisShare(-1, 500)).toBe(0);
  });
});
