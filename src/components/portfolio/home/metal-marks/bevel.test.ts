import { describe, expect, it } from 'vitest';
import { bevelField, distanceToOutline, labelShapes } from './bevel';

function rect(width: number, height: number, x0: number, y0: number, x1: number, y1: number) {
  const mask = new Uint8Array(width * height);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) mask[y * width + x] = 1;
  return mask;
}

describe('distanceToOutline', () => {
  it('measures the Euclidean distance to the nearest outside pixel', () => {
    const inside = rect(9, 9, 1, 1, 8, 8);
    const d = distanceToOutline(inside, 9, 9);
    expect(d[0]).toBe(0);
    expect(d[1 * 9 + 1]).toBe(1);
    expect(d[4 * 9 + 4]).toBe(4);
    expect(d[2 * 9 + 2]).toBe(2);
  });

  it('treats the image border as outside', () => {
    const inside = new Uint8Array(5 * 5).fill(1);
    const d = distanceToOutline(inside, 5, 5);
    expect(d[0]).toBe(1);
    expect(d[2 * 5 + 2]).toBe(3);
  });
});

describe('labelShapes', () => {
  it('labels 4-connected shapes', () => {
    const a = rect(10, 4, 0, 0, 3, 4);
    const b = rect(10, 4, 5, 1, 10, 3);
    const both = a.map((v, i) => v | b[i]);
    const { labels, count } = labelShapes(both, 10, 4);
    expect(count).toBe(2);
    expect(labels[0]).not.toBe(labels[1 * 10 + 6]);
  });
});

describe('bevelField', () => {
  it('normalises the relief per shape: a thin bar peaks as high as a thick block', () => {
    const width = 40;
    const height = 24;
    const thick = rect(width, height, 2, 2, 22, 22);
    const thin = rect(width, height, 28, 4, 32, 20);
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = thick[i] || thin[i] ? 255 : 0;
    const texels = bevelField(alpha, width, height, { insideAlpha: 128, smoothRadius: 0 });
    const g = (x: number, y: number) => texels[(y * width + x) * 2 + 1];
    expect(g(12, 12)).toBe(255);
    expect(Math.max(g(29, 12), g(30, 12))).toBe(255);
    expect(g(0, 0)).toBe(0);
    expect(texels[(12 * width + 12) * 2]).toBe(255);
  });

  it('keeps coverage in R and rises from the outline', () => {
    const alpha = new Uint8Array(16 * 16);
    const inside = rect(16, 16, 2, 2, 14, 14);
    for (let i = 0; i < alpha.length; i++) alpha[i] = inside[i] ? 200 : 0;
    const texels = bevelField(alpha, 16, 16, { insideAlpha: 128, smoothRadius: 1 });
    const row = [2, 3, 4, 5, 6, 7].map((x) => texels[(8 * 16 + x) * 2 + 1]);
    for (let i = 1; i < row.length; i++) expect(row[i]).toBeGreaterThanOrEqual(row[i - 1]);
    expect(texels[(8 * 16 + 8) * 2]).toBe(200);
  });
});
