import { describe, expect, it } from 'vitest';
import { guideRect } from './guide-rect';

const base = { room: 8, inset: 8, viewportWidth: 1440, scrollX: 0, scrollY: 0 };

describe('guideRect (BL-09)', () => {
  it('takes 8 px around the target', () => {
    expect(guideRect({ left: 320, top: 400, width: 480, height: 40 }, base)).toEqual({
      left: 312,
      top: 392,
      width: 496,
      height: 56,
    });
  });

  it('keeps 8 px from the viewport sides, like the reference', () => {
    const box = guideRect({ left: 4, top: 0, width: 1434, height: 10 }, base);
    expect(box.left).toBe(8);
    expect(box.left + box.width).toBe(1432);
  });

  it('lives in document coordinates', () => {
    const box = guideRect(
      { left: 100, top: 50, width: 100, height: 20 },
      {
        ...base,
        scrollX: 5,
        scrollY: 1200,
      },
    );
    expect(box).toEqual({ left: 97, top: 1242, width: 116, height: 36 });
  });
});
