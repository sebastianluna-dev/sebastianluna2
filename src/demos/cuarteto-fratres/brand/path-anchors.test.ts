import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MONOGRAM_PATHS, testerText } from './monogram';
import { pathAnchors } from './path-anchors';

describe('pathAnchors', () => {
  it('keeps the monogram paths equal to the SVG file', () => {
    const svg = readFileSync(new URL('../assets/logo-cf.svg', import.meta.url), 'utf8');
    const inFile = [...svg.matchAll(/ d="([^"]+)"/g)].map((match) => match[1]);
    expect(inFile).toEqual([MONOGRAM_PATHS.C, MONOGRAM_PATHS.F]);
  });

  it('reads the C: eleven anchors, handles on the curves only', () => {
    const anchors = pathAnchors(MONOGRAM_PATHS.C);
    expect(anchors.map(({ x, y }) => [x, y])).toEqual([
      [634, 139],
      [511, 78],
      [351, 235],
      [511, 386],
      [641, 306],
      [633, 302],
      [523, 371],
      [393, 232],
      [509, 89],
      [615, 164],
      [623, 164],
    ]);
    expect(anchors[0]).toEqual({ x: 634, y: 139, in: null, out: { x: 601, y: 97 } });
    expect(anchors[1]).toEqual({ x: 511, y: 78, in: { x: 561, y: 78 }, out: { x: 419, y: 78 } });
    // The line from the outer bowl to the inner one: a corner on both sides of it.
    expect(anchors[4]).toEqual({ x: 641, y: 306, in: { x: 621, y: 354 }, out: null });
    expect(anchors[5]).toEqual({ x: 633, y: 302, in: null, out: { x: 611, y: 345 } });
    expect(anchors[10]).toEqual({ x: 623, y: 164, in: null, out: null });
  });

  it('reads the F: H and V keep the other coordinate', () => {
    const anchors = pathAnchors(MONOGRAM_PATHS.F);
    expect(anchors).toHaveLength(22);
    expect(anchors.slice(0, 5)).toEqual([
      { x: 474, y: 158, in: null, out: null },
      { x: 620, y: 158, in: null, out: null },
      { x: 624, y: 208, in: null, out: null },
      { x: 616, y: 208, in: null, out: { x: 601, y: 176 } },
      { x: 539, y: 170, in: { x: 576, y: 170 }, out: null },
    ]);
    expect(anchors[21]).toEqual({ x: 474, y: 165, in: { x: 488, y: 167 }, out: null });
    expect(anchors.filter((a) => a.in || a.out)).toHaveLength(12);
  });

  it('merges a closing point that repeats the start, and repeats commands', () => {
    expect(pathAnchors('M0 0 C0 10 10 10 10 0 C10 -10 0 -10 0 0 Z')).toEqual([
      { x: 0, y: 0, in: { x: 0, y: -10 }, out: { x: 0, y: 10 } },
      { x: 10, y: 0, in: { x: 10, y: 10 }, out: { x: 10, y: -10 } },
    ]);
    expect(pathAnchors('M0 0 10 0 L10 10 0 10 Z').map(({ x, y }) => [x, y])).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
  });

  it('refuses what it does not read', () => {
    expect(() => pathAnchors('m0 0 l10 10')).toThrow();
    expect(() => pathAnchors('M0 0 Q5 5 10 10')).toThrow();
    expect(() => pathAnchors('L10 10')).toThrow();
  });
});

describe('testerText', () => {
  it('sets capitals and keeps 24 characters', () => {
    expect(testerText('cuarteto fratres')).toBe('CUARTETO FRATRES');
    expect(testerText('niño año')).toBe('NIÑO AÑO');
    expect(testerText('a'.repeat(30))).toHaveLength(24);
  });
});
