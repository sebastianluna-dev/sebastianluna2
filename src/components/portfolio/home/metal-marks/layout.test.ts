import { describe, expect, it } from 'vitest';
import {
  canPreheatMetal,
  followFactor,
  isSoftwareRenderer,
  magnetOffsets,
  magnetRadius,
  markQuad,
  minFrameMs,
  rasterSize,
  smoothstep01,
} from './layout';
import { METAL_RASTER } from './tuning';

describe('markQuad', () => {
  it('fits a wide shape to the box width and adds the margin of its long side', () => {
    const quad = markQuad({ x: 100, y: 50 }, { width: 114, height: 28.57 }, 4, 0.07);
    // 114 / 4 = 28.5 fits under 28.57, margin 7.98 on every side.
    expect(quad.width).toBeCloseTo(114 + 2 * 7.98, 2);
    expect(quad.height).toBeCloseTo(28.5 + 2 * 7.98, 2);
    expect(quad.x + quad.width / 2).toBeCloseTo(100);
    expect(quad.y + quad.height / 2).toBeCloseTo(50);
  });

  it('fits a square glyph to a height-capped box (42.86 × 34)', () => {
    const quad = markQuad({ x: 0, y: 0 }, { width: 42.86, height: 34 }, 1, 0.07);
    expect(quad.width).toBeCloseTo(34 * 1.14, 5);
    expect(quad.height).toBeCloseTo(34 * 1.14, 5);
  });
});

describe('rasterSize', () => {
  it('uses the long side for a square glyph', () => {
    expect(rasterSize(1)).toMatchObject({ width: 500, height: 500 });
  });

  it('raises a thin wordmark to the minimum short side', () => {
    const { width, height } = rasterSize(6.15);
    expect(height).toBeGreaterThanOrEqual(METAL_RASTER.minShortSide - 1);
    expect(width).toBeLessThanOrEqual(METAL_RASTER.maxLongSide);
  });

  it('keeps the padded aspect of the quad', () => {
    const { width, height, aspect } = rasterSize(4.48, 0.07);
    const pad = 0.07 * 4.48;
    expect(aspect).toBeCloseTo((4.48 + 2 * pad) / (1 + 2 * pad), 6);
    expect(width / height).toBeCloseTo(aspect, 1);
  });
});

describe('magnetism (EF-08)', () => {
  it('clamps the radius between 96 and 180', () => {
    expect(magnetRadius(200)).toBe(96);
    expect(magnetRadius(374)).toBeCloseTo(134.64);
    expect(magnetRadius(520)).toBe(180);
  });

  it('pulls towards the pointer with force 1 − d/r and caps at ±5 / ±4', () => {
    const [near, far, centre] = magnetOffsets(
      { x: 100, y: 100 },
      [
        { x: 60, y: 60 },
        { x: 400, y: 400 },
        { x: 100, y: 100 },
      ],
      [1.12, 1, 1],
      520,
    );
    // d = 56.57, force .6857, 40 × .6857 × .28 × 1.12 = 8.6 → capped.
    expect(near).toEqual({ x: 5, y: 4 });
    expect(far).toEqual({ x: 0, y: 0 });
    expect(centre).toEqual({ x: 0, y: 0 });
  });

  it('rounds to a tenth of a pixel inside the caps', () => {
    const [offset] = magnetOffsets({ x: 110, y: 100 }, [{ x: 100, y: 100 }], [1], 520);
    // 10 × (1 − 10/180) × .28 = 2.644…
    expect(offset).toEqual({ x: 2.6, y: 0 });
  });
});

describe('frame maths', () => {
  it('follows with τ = 60 ms', () => {
    expect(followFactor(0)).toBe(0);
    expect(followFactor(60)).toBeCloseTo(1 - Math.exp(-1), 10);
  });

  it('smoothsteps the cross-fade', () => {
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(0.5)).toBe(0.5);
    expect(smoothstep01(2)).toBe(1);
  });

  it('caps at 30 fps on coarse pointers or ≤ 4 cores', () => {
    expect(minFrameMs(true, 8, 30, 4)).toBeCloseTo(1000 / 30 - 2);
    expect(minFrameMs(false, 4, 30, 4)).toBeCloseTo(1000 / 30 - 2);
    expect(minFrameMs(false, 8, 30, 4)).toBe(0);
  });
});

describe('canPreheatMetal', () => {
  const GPU = 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)';

  it('preheats with more than the low-end cores and a hardware GPU', () => {
    expect(canPreheatMetal(8, GPU, 4)).toBe(true);
  });

  it('waits for the viewport with few cores, a software or an unknown renderer', () => {
    expect(canPreheatMetal(4, GPU, 4)).toBe(false);
    expect(canPreheatMetal(8, 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))', 4)).toBe(false);
    expect(canPreheatMetal(8, '', 4)).toBe(false);
  });

  it('recognises the usual software rasterisers', () => {
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver')).toBe(true);
    expect(isSoftwareRenderer('Apple GPU')).toBe(false);
  });
});
