import { describe, expect, it } from 'vitest';
import { LIGHTBOX } from '@/components/motion/presets';
import {
  FIGURE_SIZES,
  FIGURE_WIDTHS,
  applyGallerySizes,
  closeKeyframes,
  closesOnClick,
  flipTransform,
  gallerySizes,
  isRectInView,
  lightboxSourceWidth,
  openKeyframes,
  parseSrcset,
  pickLightboxSource,
} from './lightbox';

const SRCSET = '/a-720.webp 720w, /a-360.webp 360w, /a-1600.webp 1600w, /a-1080.webp 1080w';

describe('gallery sizes (design-spec §3.2)', () => {
  it('uses the column for single figures', () => {
    expect(FIGURE_SIZES).toBe('(min-width: 760px) 720px, calc(100vw - 40px)');
    expect(gallerySizes('lead')).toEqual([FIGURE_SIZES]);
  });

  it('gives each slot its measured width', () => {
    expect(gallerySizes('pair')).toEqual(['(min-width: 810px) 352px, calc(100vw - 40px)']);
    expect(gallerySizes('pair-2col-phone')).toEqual([
      '(min-width: 810px) 352px, calc((100vw - 52px) / 2)',
    ]);
    expect(gallerySizes('composition')).toEqual([
      '(min-width: 810px) 470px, calc(100vw - 40px)',
      '(min-width: 810px) 235px, calc(100vw - 40px)',
    ]);
  });

  it('rewrites the rendered figures in order and repeats the last slot', () => {
    const img = `<img sizes="${FIGURE_SIZES}">`;
    const html = `<figure>${img}</figure><figure>${img}</figure><figure>${img}</figure>`;
    const out = applyGallerySizes(html, 'composition');
    const [main, side] = gallerySizes('composition');
    expect(out).toBe(
      `<figure><img sizes="${main}"></figure><figure><img sizes="${side}"></figure><figure><img sizes="${side}"></figure>`,
    );
    expect(applyGallerySizes('<div>no images</div>', 'pair')).toBe('<div>no images</div>');
  });
});

describe('enlarged source (CA-07)', () => {
  it('parses and sorts width descriptors', () => {
    expect(parseSrcset(SRCSET).map((c) => c.width)).toEqual([360, 720, 1080, 1600]);
    expect(parseSrcset('/x.webp 2x, /y.webp')).toEqual([]);
    expect(parseSrcset(null)).toEqual([]);
  });

  it('wants clamp(960, 1.25 · innerWidth, 1600)', () => {
    expect(lightboxSourceWidth(390)).toBe(LIGHTBOX.source.minWidth);
    expect(lightboxSourceWidth(1024)).toBe(1280);
    expect(lightboxSourceWidth(1440)).toBe(LIGHTBOX.source.maxWidth);
  });

  it('picks the first candidate wide enough, else the largest, else the fallback', () => {
    expect(pickLightboxSource(SRCSET, 390)).toBe('/a-1080.webp');
    expect(pickLightboxSource(SRCSET, 1440)).toBe('/a-1600.webp');
    expect(pickLightboxSource('/s.webp 360w, /m.webp 720w', 1440)).toBe('/m.webp');
    expect(pickLightboxSource('', 1440, '/original.jpg')).toBe('/original.jpg');
  });
});

describe('FLIP (CA-07, CA-08)', () => {
  it('reproduces the measured start of the reference (scale 720/1072)', () => {
    const thumb = { left: 360, top: 295.6, width: 720, height: 540 };
    const big = { left: 184, top: 48, width: 1072, height: 804 };
    expect(flipTransform(thumb, big)).toBe('translate3d(0px, 115.6px, 0) scale(0.6716)');
  });

  it('covers the thumbnail when the ratios differ', () => {
    const thumb = { left: 0, top: 0, width: 400, height: 300 };
    const big = { left: 0, top: 0, width: 1600, height: 900 };
    // 300 / 900 > 400 / 1600: the height decides, so the image covers the 4:3 box.
    expect(flipTransform(thumb, big)).toContain('scale(0.3333)');
  });

  it('returns null for empty rects', () => {
    expect(flipTransform(null, { left: 0, top: 0, width: 1, height: 1 })).toBeNull();
    expect(
      flipTransform(
        { left: 0, top: 0, width: 0, height: 10 },
        { left: 0, top: 0, width: 1, height: 1 },
      ),
    ).toBeNull();
  });

  it('knows when the thumbnail is in view', () => {
    expect(isRectInView({ left: 0, top: -100, width: 10, height: 120 }, 800)).toBe(true);
    expect(isRectInView({ left: 0, top: -200, width: 10, height: 120 }, 800)).toBe(false);
    expect(isRectInView({ left: 0, top: 800, width: 10, height: 120 }, 800)).toBe(false);
    expect(isRectInView(null, 800)).toBe(false);
  });

  it('opens opaque by 12 % and closes opaque until 85 %', () => {
    const open = openKeyframes('scale(0.5)');
    expect(open[1]).toEqual({ transform: 'scale(0.5)', opacity: 1, offset: 0.12 });
    expect(open[2]).toEqual({ transform: 'none', opacity: 1 });
    const close = closeKeyframes('scale(0.5)');
    expect(close[1]).toEqual({ transform: 'scale(0.5)', opacity: 1, offset: 0.85 });
    expect(close[2]).toEqual({ transform: 'scale(0.5)', opacity: 0 });
  });

  it('falls back to opacity only', () => {
    expect(openKeyframes(null)).toEqual([{ opacity: 0 }, { opacity: 1 }]);
    expect(closeKeyframes(null)).toEqual([{ opacity: 1 }, { opacity: 0 }]);
  });
});

describe('figure widths', () => {
  it('end at the largest enlarged source, smallest first', () => {
    expect(FIGURE_WIDTHS.at(-1)).toBe(LIGHTBOX.source.maxWidth);
    expect([...FIGURE_WIDTHS].sort((a, b) => a - b)).toEqual([...FIGURE_WIDTHS]);
  });
});

describe('closesOnClick (CA-08)', () => {
  const settled = LIGHTBOX.open.scrimMs;

  it('closes on a single click once the scrim is in', () => {
    expect(closesOnClick({ onClose: false, detail: 1, sinceOpenMs: settled })).toBe(true);
  });

  it('ignores the second click of the double click that opened it', () => {
    expect(closesOnClick({ onClose: false, detail: 2, sinceOpenMs: settled + 400 })).toBe(false);
    expect(closesOnClick({ onClose: false, detail: 1, sinceOpenMs: settled - 1 })).toBe(false);
  });

  it('always closes from the Close button', () => {
    expect(closesOnClick({ onClose: true, detail: 2, sinceOpenMs: 0 })).toBe(true);
  });
});
