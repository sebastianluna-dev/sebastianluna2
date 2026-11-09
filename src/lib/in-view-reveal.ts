/**
 * Reversible in-view reveal of the /about Experience rows (about-spec §4.3, `ABOUT_EXPERIENCE_REVEAL`):
 * an element is "in" while at least `threshold` of it intersects the viewport and "out" otherwise, on
 * every entry and exit. With reduced motion it is always "in": nothing hides.
 */
import type { MotionValues } from '@/components/motion/types';

export type RevealState = 'in' | 'out';

export interface RevealEntry {
  isIntersecting: boolean;
  intersectionRatio: number;
}

/** State an element should be in after an IntersectionObserver entry. */
export function revealState(
  entry: RevealEntry,
  threshold: number,
  reducedMotion: boolean,
): RevealState {
  if (reducedMotion) return 'in';
  return entry.isIntersecting && entry.intersectionRatio >= threshold ? 'in' : 'out';
}

/** IntersectionObserver thresholds that report every crossing of `threshold` (and of 0). */
export function revealThresholds(threshold: number): number[] {
  return threshold > 0 ? [0, threshold] : [0];
}

/** A type alias, not an interface, so it is assignable to the DOM `Keyframe`. */
export type RevealFrame = {
  opacity: number;
  /** CSS `translate` value. */
  translate: string;
};

/** End values of a reveal preset for `state`: `animate` when in, `initial` when out. */
export function revealFrame(
  preset: { initial: MotionValues; animate: MotionValues },
  state: RevealState,
): RevealFrame {
  const values = state === 'in' ? preset.animate : preset.initial;
  return {
    opacity: values.opacity ?? 1,
    translate: `${values.x ?? 0}px ${values.y ?? 0}px`,
  };
}
