/*
 * The measured figures of the quartet site's first load on a phone (cuartetofratres,
 * IMPROVEMENTS.md, «10. First load on a phone: what was tried»), and the count-up that shows them.
 * Nothing here is rounded or derived: every number is the one in the record.
 */

/** Seconds on a throttled phone, before and after the work. */
export const PAINT = {
  lcp: { before: 2.61, after: 1.32 },
  fcp: { before: 1.42, after: 0.79 },
} as const;

/** Home page HTML in KB; `music` is the part of `before` that was the engraved music, inlined twice. */
export const WEIGHT = {
  before: 463,
  after: 139,
  music: 375,
  gzipBefore: 94,
  gzipAfter: 26,
  fontsBefore: 14,
  fontsAfter: 8,
} as const;

/** Lighthouse, mobile, on the production site, after the work. There is no valid «before». */
export const LIGHTHOUSE = {
  performance: 98,
  accessibility: 100,
  bestPractices: 100,
  seo: 100,
} as const;

/** The CSS-inlining experiment, against what was shipped; it was reverted. */
export const DISCARDED = {
  fcp: { shipped: 0.79, inlined: 0.56 },
  lcp: { shipped: 1.32, inlined: 2.05 },
} as const;

/** The end of each time axis and of the weight axis: both start at zero. */
export const SECONDS_AXIS = 3;
export const KB_AXIS = 500;

/** Length of the count-up and of the bars growing, in ms; the CSS uses the same curve. */
export const COUNT_UP_MS = 900;

/** Ease-out cubic, `cubic-bezier(0.33, 1, 0.68, 1)` in the CSS. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/** The value shown at `progress` (0 to 1) of the count-up; at 1 it is exactly `target`. */
export function countUp(target: number, progress: number): number {
  if (progress >= 1) return target;
  if (progress <= 0) return 0;
  return target * easeOutCubic(progress);
}

/** A figure with a fixed number of decimals (a point in both languages, as the record writes it). */
export function formatFigure(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

/** Share of an axis, 0 to 1, that a value takes. */
export function axisShare(value: number, max: number): number {
  return Math.min(1, Math.max(0, value / max));
}
