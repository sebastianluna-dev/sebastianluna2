/**
 * Pure helpers of the case figures and their lightbox (CA-07, CA-08; design-spec §3.2, case.md §2.3,
 * §3.6): the `sizes` of each gallery slot, the enlarged source picked from a thumbnail `srcset`, the
 * FLIP transform between the thumbnail and the enlarged image, and the WAAPI keyframes of both ways.
 */
import { LIGHTBOX } from '@/components/motion/presets';

// ------------------------------------------------------------------ responsive sizes

/**
 * Layout values the `sizes` attribute needs as literals; they mirror `--pf-case-col`,
 * `--pf-gutter-case`, `--pf-gallery-gap` (16, 12 on phones) and the phone breakpoint (≤809.98).
 * Exported so `tokens.test.ts` keeps them in sync with `tokens.css`.
 */
export const CASE_COL = 720;
export const GUTTER = 20;
export const GAP = 16;
export const PHONE_GAP = 12;
export const WIDE_MIN = 810;

/** Thumbnail widths of a figure, up to the largest enlarged source the lightbox asks for (CA-07). */
export const FIGURE_WIDTHS = [360, 720, 1080, 1440, LIGHTBOX.source.maxWidth] as const;

const px = (value: number) => `${Math.ceil(value)}px`;
/** Column width on phones: the viewport minus both gutters (the column caps at 720 from 760 up). */
const PHONE_COL = `calc(100vw - ${2 * GUTTER}px)`;
const PAIR = px((CASE_COL - GAP) / 2);
const COMPOSITION_MAIN = px(((CASE_COL - GAP) * 2) / 3);
const COMPOSITION_SIDE = px((CASE_COL - GAP) / 3);

/** `sizes` of a figure as wide as the column (standalone figures, lead galleries, the hero cover). */
export const FIGURE_SIZES = `(min-width: ${CASE_COL + 2 * GUTTER}px) ${CASE_COL}px, ${PHONE_COL}`;

export type GalleryLayout = 'lead' | 'pair' | 'pair-2col-phone' | 'composition';

/**
 * `sizes` of each figure of a gallery row, in order; the last one repeats for the rest. Wide
 * (≥810): 720, 352 per pair, 470 + 235 for the composition. Phones: the column, or half of it minus
 * the 12 gap for `pair-2col-phone`.
 */
export function gallerySizes(layout: GalleryLayout): string[] {
  const wide = (width: string, phone = PHONE_COL) =>
    `(min-width: ${WIDE_MIN}px) ${width}, ${phone}`;
  switch (layout) {
    case 'lead':
      return [FIGURE_SIZES];
    case 'pair':
      return [wide(PAIR)];
    case 'pair-2col-phone':
      return [wide(PAIR, `calc((100vw - ${2 * GUTTER + PHONE_GAP}px) / 2)`)];
    case 'composition':
      return [wide(COMPOSITION_MAIN), wide(COMPOSITION_SIDE)];
  }
}

/**
 * Rewrites, in document order, every `sizes="FIGURE_SIZES"` of the rendered figures of a gallery
 * with the size of its slot (a Figure cannot know which gallery it is in).
 */
export function applyGallerySizes(html: string, layout: GalleryLayout): string {
  const sizes = gallerySizes(layout);
  const needle = `sizes="${FIGURE_SIZES}"`;
  let index = 0;
  return html.split(needle).reduce((out, part, i) => {
    if (i === 0) return part;
    const value = sizes[Math.min(index, sizes.length - 1)];
    index += 1;
    return `${out}sizes="${value}"${part}`;
  }, '');
}

// ------------------------------------------------------------------ enlarged source

export interface SrcsetCandidate {
  url: string;
  width: number;
}

/** Width descriptors of a `srcset`, smallest first; candidates without a valid `w` are dropped. */
export function parseSrcset(srcset: string | null | undefined): SrcsetCandidate[] {
  if (!srcset) return [];
  return srcset
    .split(/,\s+/)
    .map((candidate) => candidate.trim().split(/\s+/))
    .map(([url = '', descriptor = '']) => ({
      url,
      width: /^\d+w$/.test(descriptor) ? Number.parseInt(descriptor, 10) : 0,
    }))
    .filter((c) => c.url !== '' && c.width > 0)
    .sort((a, b) => a.width - b.width);
}

/** CA-07: wanted width of the enlarged image, clamp(960, 1.25 · innerWidth, 1600). */
export function lightboxSourceWidth(
  innerWidth: number,
  source: { minWidth: number; vwFactor: number; maxWidth: number } = LIGHTBOX.source,
): number {
  return Math.min(
    source.maxWidth,
    Math.max(source.minWidth, Math.round(innerWidth * source.vwFactor)),
  );
}

/**
 * The enlarged source: the first candidate at least `lightboxSourceWidth` wide, else the largest,
 * else `fallback` (the `currentSrc` or the link to the original image).
 */
export function pickLightboxSource(
  srcset: string | null | undefined,
  innerWidth: number,
  fallback: string | null = null,
): string | null {
  const candidates = parseSrcset(srcset);
  if (candidates.length === 0) return fallback;
  const wanted = lightboxSourceWidth(innerWidth);
  return (candidates.find((c) => c.width >= wanted) ?? candidates[candidates.length - 1]).url;
}

// ------------------------------------------------------------------ FLIP

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** True when some of the rect is inside the viewport height (the thumbnail can be flown from). */
export function isRectInView(rect: RectLike | null, viewportHeight: number): boolean {
  return !!rect && rect.top + rect.height > 0 && rect.top < viewportHeight;
}

/**
 * Transform that puts `target` (laid out at its final rect, origin at its centre) over `from`, scaled
 * to cover it: the larger of both ratios, as the thumbnail crops with `object-fit: cover`. Null when
 * a rect is empty.
 */
export function flipTransform(from: RectLike | null, target: RectLike | null): string | null {
  if (!from || !target) return null;
  if (from.width < 1 || from.height < 1 || target.width < 1 || target.height < 1) return null;
  const scale = Math.max(from.width / target.width, from.height / target.height);
  const dx = from.left + from.width / 2 - (target.left + target.width / 2);
  const dy = from.top + from.height / 2 - (target.top + target.height / 2);
  return `translate3d(${round(dx)}px, ${round(dy)}px, 0) scale(${round(scale, 4)})`;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// ------------------------------------------------------------------ keyframes

/** CA-07: from the thumbnail to its place, opaque after the first 12 %; opacity only without FLIP. */
export function openKeyframes(transform: string | null): Keyframe[] {
  if (!transform) return [{ opacity: 0 }, { opacity: 1 }];
  return [
    { transform, opacity: 0 },
    { transform, opacity: 1, offset: LIGHTBOX.open.imageFadeUntil },
    { transform: 'none', opacity: 1 },
  ];
}

/** CA-08: back to the thumbnail, opaque until 85 % of the way; opacity only without FLIP. */
export function closeKeyframes(transform: string | null): Keyframe[] {
  if (!transform) return [{ opacity: 1 }, { opacity: 0 }];
  return [
    { transform: 'none', opacity: 1 },
    { transform, opacity: 1, offset: LIGHTBOX.close.imageHoldUntil },
    { transform, opacity: 0 },
  ];
}

// ------------------------------------------------------------------ dismiss

/** What a click inside the open lightbox knows when it decides whether to close it (CA-08). */
export interface DismissClick {
  /** The click landed on the Close button: it always closes. */
  onClose: boolean;
  /** `MouseEvent.detail`: 2+ for the later clicks of a double click. */
  detail: number;
  /** Time since the lightbox opened, in ms. */
  sinceOpenMs: number;
}

/**
 * CA-08: a click anywhere closes, except the second click of the double click that opened it (or any
 * click before the scrim is in); the Close button and Escape always close.
 */
export function closesOnClick(
  { onClose, detail, sinceOpenMs }: DismissClick,
  settleMs: number = LIGHTBOX.open.scrimMs,
): boolean {
  if (onClose) return true;
  return detail <= 1 && sinceOpenMs >= settleMs;
}
