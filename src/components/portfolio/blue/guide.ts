/**
 * BL-09: when a link in Blue's answer leads to a section, the section scrolls into view and a thin
 * outline breathes around it once (WAAPI, `BLUE.guide`). Reduced motion: an instant jump and an
 * opacity-only outline. A target taller than most of the viewport is outlined by its heading.
 *
 * The outline lives in document coordinates (`position: absolute` in <body>), so it rides along
 * with a smooth scroll that is still running when it appears. Like the reference, it sits 8 px
 * around the target (`--pf-blue-guide-pad` + its border) and keeps 8 px from the viewport's sides.
 */
import { BLUE } from '@/components/motion/presets';
import { prefersReducedMotion } from '@/lib/motion-policy';
import { guideRect } from '@/lib/blue/client/guide-rect';

const GUIDE = BLUE.guide;
const HEADING_SELECTOR = 'h1, h2, h3';

/** The id a hash points at; `null` for an empty or malformed one (`#%zz`). */
export function hashId(hash: string): string | null {
  try {
    return decodeURIComponent(hash.replace(/^#/, '')) || null;
  } catch {
    return null;
  }
}

function targetOf(hash: string): HTMLElement | null {
  const id = hashId(hash);
  if (!id) return null;
  const section = document.getElementById(id);
  if (!section) return null;
  const tall = section.getBoundingClientRect().height > innerHeight * GUIDE.maxViewportShare;
  return tall ? (section.querySelector<HTMLElement>(HEADING_SELECTOR) ?? section) : section;
}

function cssPx(element: Element, property: string): number {
  return parseFloat(getComputedStyle(element).getPropertyValue(property)) || 0;
}

/** Scrolls to the element of `hash` and outlines it; does nothing when the page has no such id. */
export function guideTo(hash: string): void {
  const target = targetOf(hash);
  if (!target) return;
  const reduced = prefersReducedMotion();
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  window.setTimeout(
    () => {
      if (!target.isConnected) return;
      const outline = document.createElement('div');
      outline.className = 'pf-blue-guide';
      outline.setAttribute('aria-hidden', 'true');
      document.body.append(outline);
      const root = document.documentElement;
      const box = guideRect(target.getBoundingClientRect(), {
        // Padding plus the 1 px border.
        room: cssPx(outline, '--pf-blue-guide-pad') + 1,
        inset: cssPx(outline, '--pf-blue-guide-inset'),
        viewportWidth: root.clientWidth,
        scrollX,
        scrollY,
      });
      Object.assign(outline.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      });
      const [from, peak, to] = GUIDE.opacity;
      const keyframes: Keyframe[] = reduced
        ? [{ opacity: from }, { opacity: peak }, { opacity: to }]
        : GUIDE.scale.map((scale, i) => ({ opacity: GUIDE.opacity[i], scale: String(scale) }));
      const animation = outline.animate(keyframes, {
        duration: reduced ? GUIDE.reducedDurationMs : GUIDE.durationMs,
        easing: GUIDE.easing,
        fill: 'forwards',
      });
      animation.finished.catch(() => {}).finally(() => outline.remove());
    },
    reduced ? 0 : GUIDE.delayMs,
  );
}
