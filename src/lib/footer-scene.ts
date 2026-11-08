/**
 * Pure helpers of the footer scene (SH-09, SH-16). The DOM side lives in
 * `src/components/portfolio/shell/footer-stage.client.ts`; every timing in `FOOTER_SCENE`.
 */
import { FOOTER_SCENE } from '@/components/motion/presets';

/** SH-09: does the footer stage show enough of itself (rect in viewport px)? */
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
