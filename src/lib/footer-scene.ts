/**
 * Pure helpers of the footer scene (SH-09, SH-14, SH-16). The DOM side lives in
 * `src/components/portfolio/shell/footer-portrait.client.ts`; every timing in `FOOTER_SCENE`.
 */
import { FOOTER_SCENE } from '@/components/motion/presets';

/** SH-09: does the portrait show enough of itself (rect in viewport px)? */
export function sceneShowsEnough(
  rect: { top: number; bottom: number; width: number; height: number },
  viewportHeight: number,
): boolean {
  if (rect.width === 0) return false;
  const visible = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
  const { shareOfHeight, shareOfViewport } = FOOTER_SCENE.trigger;
  return visible >= Math.min(rect.height * shareOfHeight, viewportHeight * shareOfViewport);
}

/**
 * SH-16: delay (ms) of social button `index` when it is animated `elapsedMs` after the scene
 * started; negative resumes mid-flight. `null` when its entrance would already be over.
 */
export function socialEntranceDelay(index: number, elapsedMs: number): number | null {
  const { startMs, stepMs, durationMs } = FOOTER_SCENE.socials;
  const at = startMs + index * stepMs;
  const elapsed = Math.max(0, elapsedMs);
  return elapsed >= at + durationMs ? null : at - elapsed;
}

/** One hand motion of SH-15 as WAAPI pieces: each property on its own track, eased per segment. */
export interface HandTrack {
  keyframes: Keyframe[];
  timing: { delay: number; duration: number; fill?: FillMode };
}

/** SH-15: the grip (fade + rise) and the pull of hand `index` (0 left, 1 right). */
export function handTracks(index: number): HandTrack[] {
  const { grip, pull } = FOOTER_SCENE.hands;
  const at = (delays: readonly number[]) => delays[Math.min(index, delays.length - 1)];
  const rise = (ys: readonly number[], offsets: readonly number[], easing: string) =>
    ys.map((y, i) => ({
      translate: `0 ${y}px`,
      offset: offsets[i],
      ...(i < ys.length - 1 ? { easing } : {}),
    }));
  return [
    {
      // The fade is the first `fadeShare` of the grip, on the same curve.
      keyframes: [{ opacity: 0, easing: grip.easing }, { opacity: 1 }],
      timing: { delay: at(grip.delaysMs), duration: grip.durationMs * grip.fadeShare },
    },
    {
      keyframes: rise(grip.y, grip.offsets, grip.easing),
      timing: { delay: at(grip.delaysMs), duration: grip.durationMs },
    },
    {
      // No fill: during its delay the pull must not hide the grip's rise on the same property.
      keyframes: rise(pull.y, pull.offsets, pull.easing),
      timing: { delay: at(pull.delaysMs), duration: pull.durationMs, fill: 'none' },
    },
  ];
}

/** SH-14: translate keyframes of the head rise for a head `height` px tall. */
export function headRiseKeyframes(height: number): Keyframe[] {
  const { rise, riseEasings } = FOOTER_SCENE.head;
  const ys = [...rise.shares.map((share) => share * height), rise.overshootPx, 0];
  return ys.map((y, i) => ({
    translate: `0 ${Math.round(y * 100) / 100}px`,
    offset: rise.offsets[i],
    ...(riseEasings[i] ? { easing: riseEasings[i] } : {}),
  }));
}
