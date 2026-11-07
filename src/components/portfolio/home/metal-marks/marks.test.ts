import { describe, expect, it } from 'vitest';
import { TECHNOLOGIES, TECHNOLOGY_VIEWBOX } from '@/data/technologies';
import { buildMarks, MARK_STYLES, markWidth } from './marks';
import { WORDMARKS } from './wordmarks';

describe('markWidth', () => {
  it('follows min(cap, 30 × scale × ratio) × 8/7', () => {
    expect(markWidth({ scale: 1.25, mass: 1 }, 1)).toBeCloseTo(42.86, 2);
    expect(markWidth({ scale: 1, mass: 1, widthCap: 136 }, 4.83)).toBeCloseTo(155.43, 2);
    expect(markWidth({ scale: 0.78, mass: 1 }, 6.15)).toBeCloseTo(128, 2);
  });
});

describe('buildMarks', () => {
  const marks = buildMarks(TECHNOLOGIES, TECHNOLOGY_VIEWBOX);

  it('keeps the order of the stack and the 4 / 3 / 4 rhythm', () => {
    expect(marks.map((m) => m.id)).toEqual(TECHNOLOGIES.map((t) => t.id));
    expect(marks.filter((m) => m.wide).length).toBe(Math.min(3, Math.max(0, marks.length - 4)));
  });

  it('has a style for every technology and a sane wordmark for each wordmark id', () => {
    for (const tech of TECHNOLOGIES) expect(MARK_STYLES[tech.id], tech.id).toBeDefined();
    for (const [id, wordmark] of Object.entries(WORDMARKS)) {
      expect(
        TECHNOLOGIES.some((t) => t.id === id),
        id,
      ).toBe(true);
      const [, , w, h] = wordmark.viewBox.split(' ').map(Number);
      expect(w / h).toBeCloseTo(wordmark.ratio, 1);
      expect(wordmark.name.length).toBeGreaterThan(100);
    }
  });

  it('names every mark with the technology name', () => {
    for (const mark of marks)
      expect(mark.name).toBe(TECHNOLOGIES.find((t) => t.id === mark.id)?.name);
  });
});
