/**
 * Plan of the route transitions (RT-01, RT-02): which view-transition pseudo-elements get our own
 * WAAPI animation instead of the default one, and which keep the browser's but with our timing.
 * Pure, so the client only applies it (`route-transitions.client.ts`).
 */
import { ROUTE_TRANSITIONS } from '@/components/motion/presets';

type Part = 'group' | 'old' | 'new';

export interface PseudoAnimation {
  pseudo: string;
  keyframes: Keyframe[];
  timing: { duration: number; delay?: number; fill: FillMode; easing?: string };
}

export interface RoutePlan {
  /** Our animation replaces whatever the browser or Astro put on these. */
  replace: PseudoAnimation[];
  /**
   * The group morph: replaced by our own animation that starts from the browser's `from` frame
   * (`retimeKeyframes`). The curve goes on that frame and the effect runs `linear`, as in the
   * reference: easing the effect on top of the browser's `ease` keyframes would compose both curves.
   */
  retime: Record<string, { duration: number; easing: 'linear'; keyframeEasing: string }>;
}

/** The `from` frame of the browser's keyframes of a retimed pseudo-element, carrying `easing` (RT-02). */
export function retimeKeyframes(
  keyframes: readonly (Keyframe & { computedOffset?: number })[],
  easing: string,
): Keyframe[] {
  // Only the `from` frame: the end stays implicit, so it keeps following the live box of the new
  // element (the UA updates the group's own style when the cover moves under the morph).
  const [first] = keyframes;
  if (!first) return [];
  // `computedOffset` is read-only output of getKeyframes(), not a settable keyframe property.
  const frame: Keyframe & { computedOffset?: number } = { ...first, offset: 0, easing };
  delete frame.computedOffset;
  return [frame];
}

export function pseudoElement(part: Part, name: string): string {
  return `::view-transition-${part}(${name})`;
}

export function routePlan(config = ROUTE_TRANSITIONS): RoutePlan {
  const { leave, enter, cover } = config;
  const origin = { transformOrigin: leave.origin };
  return {
    replace: [
      {
        pseudo: pseudoElement('old', 'root'),
        keyframes: [
          { ...origin, opacity: 1, translate: '0 0', scale: '1' },
          { ...origin, opacity: 0, translate: `0 ${leave.y}px`, scale: String(leave.scale) },
        ],
        timing: { duration: leave.durationMs, easing: leave.easing, fill: 'both' },
      },
      {
        pseudo: pseudoElement('new', 'root'),
        keyframes: [
          { opacity: 0, translate: `0 ${enter.y}px` },
          { opacity: 1, translate: '0 0' },
        ],
        timing: {
          duration: enter.durationMs,
          delay: enter.delayMs,
          easing: enter.easing,
          fill: 'both',
        },
      },
      {
        // Each segment eased, like the group it rides on.
        pseudo: pseudoElement('old', cover.name),
        keyframes: [
          { opacity: 1, easing: cover.easing },
          { opacity: 1, offset: cover.oldHoldUntil, easing: cover.easing },
          { opacity: 0 },
        ],
        timing: { duration: cover.durationMs, fill: 'both' },
      },
      {
        pseudo: pseudoElement('new', cover.name),
        keyframes: [
          { opacity: 0, easing: cover.easing },
          { opacity: 1, offset: cover.newInBy },
          { opacity: 1 },
        ],
        timing: { duration: cover.durationMs, fill: 'both' },
      },
    ],
    retime: {
      [pseudoElement('group', cover.name)]: {
        duration: cover.durationMs,
        easing: 'linear',
        keyframeEasing: cover.easing,
      },
    },
  };
}
