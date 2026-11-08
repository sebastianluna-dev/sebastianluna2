// BL-09: where the outline around a guided-to section goes, in document coordinates. It takes
// `room` px around the target on every side and, like the reference, keeps `inset` px from the
// viewport's left and right edges.

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GuideRectOptions {
  /** Room between the target and the outline's outer edge (padding + border). */
  room: number;
  /** Minimum distance from the viewport's left and right edges. */
  inset: number;
  viewportWidth: number;
  scrollX: number;
  scrollY: number;
}

/** The outline's box for a target at `rect` (viewport coordinates, from getBoundingClientRect). */
export function guideRect(rect: RectLike, options: GuideRectOptions): RectLike {
  const { room, inset, viewportWidth } = options;
  const left = Math.max(inset, rect.left - room);
  const right = Math.min(viewportWidth - inset, rect.left + rect.width + room);
  return {
    left: left + options.scrollX,
    top: rect.top - room + options.scrollY,
    width: Math.max(0, right - left),
    height: rect.height + 2 * room,
  };
}
