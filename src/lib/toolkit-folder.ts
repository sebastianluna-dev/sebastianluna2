/**
 * Geometry of the /about "My toolkit" folder (about-spec §5.2): pure functions over one progress value
 * `p` (0 closed, 1 open, below 0 while a collection switch sinks the stamps). Every length is in px of
 * the 440 × 480 design box; the island scales the whole box with `designScale`. Springs and timings
 * live in `TOOLKIT_FOLDER` (presets.ts).
 */

/** The box the folder is drawn in, before scaling. */
export const FOLDER_DESIGN = { width: 440, height: 480, maxScale: 1.3 } as const;

/** Folder parts, in design px (top-left of the design box is 0, 0). */
export const FOLDER_PARTS = {
  /** Back body; the front sits `frontTop` below its top, both share its left and width. */
  body: { left: 46, top: 170, width: 348, height: 230 },
  /** Back tab above the body's left edge. */
  tab: { width: 110, height: 42, top: -25 },
  front: { top: 30, height: 200 },
  /** Ground shadow under the folder. */
  floor: { left: 46, top: 438, width: 348, height: 18 },
  /** Five lamp tabs along the bottom of the front. */
  lamp: { left: 14, width: 64, height: 72 },
  /** Box of the collection name that slides to the active lamp. */
  name: { width: 184, inset: 24, lead: 8 },
  stamp: { width: 200, height: 242 },
} as const;

/** What opening does to the folder itself (about-spec §5.2, "Abrir"). */
export const FOLDER_OPEN = {
  drop: 35,
  rotateClosed: -2,
  rotateOpen: -1.25,
  lidOpen: -18,
  pocketClosed: 80,
  pocketOpen: 45,
  floorScaleOpen: 1.06,
} as const;

/** How far the stamps sink (px) and fade while `p` dips below 0 to switch collection. */
export const STAMP_SINK = { depth: 52, dip: 0.3 } as const;

export interface StampPose {
  /** Offset of the stamp's centre from the centre of the design box (px). */
  x: number;
  /** Top of the unscaled stamp box in the design box (px). */
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
}

interface FanPose {
  x: readonly number[];
  y: readonly number[];
  rotate: readonly number[];
  scale: number;
}

/** Open fans of the reference (scale .85) and our closed stack peeking over the front (scale .61). */
export const STAMP_FANS: Record<
  3 | 4,
  { closed: FanPose; open: FanPose; zIndex: readonly number[] }
> = {
  3: {
    closed: { x: [-24, 0, 24], y: [135, 133, 135], rotate: [-5, 0, 5], scale: 0.61 },
    open: { x: [-112, 0, 112], y: [79, 26, 91], rotate: [-12, 0, 13], scale: 0.85 },
    zIndex: [1, 3, 2],
  },
  4: {
    closed: { x: [-36, -12, 12, 36], y: [136, 134, 134, 136], rotate: [-6, -2, 2, 6], scale: 0.61 },
    open: { x: [-124, -42, 42, 124], y: [99, 28, 43, 106], rotate: [-13, -5, 5, 14], scale: 0.85 },
    zIndex: [1, 2, 4, 3],
  },
};

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** `min(width / 440, height / 480, 1.3)`: .908 for the 400 × 436 slot, .795 for 350 × 382. */
export function designScale(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 0;
  return Math.min(
    width / FOLDER_DESIGN.width,
    height / FOLDER_DESIGN.height,
    FOLDER_DESIGN.maxScale,
  );
}

function fanFor(count: number) {
  return STAMP_FANS[count >= 4 ? 4 : 3];
}

/** Paint order of stamp `index` in a fan of `count` (higher is on top). */
export function stampZIndex(index: number, count: number): number {
  return fanFor(count).zIndex[index] ?? index + 1;
}

/**
 * Pose of stamp `index` of `count` (3 or 4) at progress `p`: closed stack at 0, fan at 1, and below 0
 * the closed stack sinks `STAMP_SINK.depth` px and fades out by `-STAMP_SINK.dip`.
 */
export function stampPose(index: number, count: number, p: number): StampPose {
  const fan = fanFor(count);
  const i = clamp(index, 0, fan.open.x.length - 1);
  const t = clamp(p, 0, 1);
  const sink = clamp(-p / STAMP_SINK.dip, 0, 1);
  return {
    x: lerp(fan.closed.x[i] ?? 0, fan.open.x[i] ?? 0, t),
    y: lerp(fan.closed.y[i] ?? 0, fan.open.y[i] ?? 0, t) + STAMP_SINK.depth * sink,
    rotate: lerp(fan.closed.rotate[i] ?? 0, fan.open.rotate[i] ?? 0, t),
    scale: lerp(fan.closed.scale, fan.open.scale, t),
    opacity: 1 - sink,
  };
}

export interface FolderPose {
  /** Drop of the folder and its floor shadow (px). */
  y: number;
  /** Rotation of the whole folder (deg). */
  rotate: number;
  /** Lid (front) rotation about its bottom edge, before the peek (deg). */
  lidRotateX: number;
  /** How far below the front's top edge the stamps stay visible (px). */
  pocket: number;
  floorScaleX: number;
}

/** The folder at progress `p`; a dip below 0 leaves it closed. */
export function folderPose(p: number): FolderPose {
  const t = clamp(p, 0, 1);
  return {
    y: FOLDER_OPEN.drop * t,
    rotate: lerp(FOLDER_OPEN.rotateClosed, FOLDER_OPEN.rotateOpen, t),
    lidRotateX: FOLDER_OPEN.lidOpen * t || 0,
    pocket: lerp(FOLDER_OPEN.pocketClosed, FOLDER_OPEN.pocketOpen, t),
    floorScaleX: lerp(1, FOLDER_OPEN.floorScaleOpen, t),
  };
}

/** Centre of lamp `index` from the front's left edge (px). */
export function lampCenter(index: number): number {
  const { left, width } = FOLDER_PARTS.lamp;
  return left + width * index + width / 2;
}

/**
 * Left edge of the collection name box for the active lamp: just before the lamp's centre, kept
 * inside the front. The indicator under it stays on the lamp's centre (`lampCenter`).
 */
export function nameOffset(index: number): number {
  const { width, inset, lead } = FOLDER_PARTS.name;
  const max = FOLDER_PARTS.body.width - inset - width;
  return clamp(lampCenter(index) - lead, inset, max);
}

/** Scene tilt (deg) for a pointer at (`u`, `v`) in 0…1 of the folder's box. */
export function sceneTilt(
  u: number,
  v: number,
  max: { maxX: number; maxY: number },
): { rotateX: number; rotateY: number } {
  const x = clamp(u, 0, 1) * 2 - 1;
  const y = clamp(v, 0, 1) * 2 - 1;
  // `|| 0` turns −0 into 0 so the centre reads as no tilt.
  return { rotateX: -y * max.maxX || 0, rotateY: x * max.maxY || 0 };
}

/**
 * Keyboard navigation of the lamp group: ←/→ step and wrap around, Home/End go to the ends.
 * `undefined` for any other key.
 */
export function nextLampIndex(current: number, key: string, count: number): number | undefined {
  if (count <= 0) return undefined;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
