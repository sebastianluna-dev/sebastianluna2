/**
 * Pure geometry of the technology wall: canvas quads, raster sizes, magnetism and frame maths
 * (EF-06…EF-08). No DOM, so it runs under Vitest.
 */
import { METAL_MAGNET, METAL_RASTER } from './tuning';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Canvas quad of a mark, in CSS px relative to the wall: the drawn shape (the box fitted to `ratio`,
 * centred in its cell) grown by the raster margin on every side.
 */
export function markQuad(
  cellCenter: Point,
  box: { width: number; height: number },
  ratio: number,
  margin: number = METAL_RASTER.margin,
): Rect {
  const width = Math.min(box.width, box.height * ratio);
  const height = width / ratio;
  const pad = margin * Math.max(width, height);
  const w = width + 2 * pad;
  const h = height + 2 * pad;
  return { x: cellCenter.x - w / 2, y: cellCenter.y - h / 2, width: w, height: h };
}

/**
 * Raster size of a mark with its margin (EF-06): long side `longSide`; a thin short side is raised to
 * `minShortSide` as long as the long side stays within `maxLongSide`.
 */
export function rasterSize(ratio: number, margin: number = METAL_RASTER.margin) {
  const { longSide, minShortSide, maxLongSide } = METAL_RASTER;
  // Shape of ratio × 1 plus the margin of the long side on every edge (same rule as markQuad).
  const safe = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const pad = margin * Math.max(safe, 1);
  const aspect = (safe + 2 * pad) / (1 + 2 * pad);
  let width = aspect >= 1 ? longSide : Math.round(longSide * aspect);
  let height = aspect >= 1 ? Math.round(longSide / aspect) : longSide;
  const short = Math.min(width, height);
  if (short < minShortSide) {
    const grow = Math.min(minShortSide / short, maxLongSide / Math.max(width, height));
    width = Math.round(width * grow);
    height = Math.round(height * grow);
  }
  return { width, height, aspect };
}

/** Influence radius of the magnet for a wall of `width` px (EF-08). */
export function magnetRadius(width: number): number {
  const { radiusMin, radiusFactor, radiusMax } = METAL_MAGNET;
  return Math.max(radiusMin, Math.min(radiusMax, width * radiusFactor));
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Offset of each mark towards the pointer (EF-08): force 1 − d/r inside the radius, times strength
 * and mass, capped at ±maxX / ±maxY. Values are rounded to 0.1 px like the reference transform.
 */
export function magnetOffsets(
  pointer: Point,
  centers: readonly Point[],
  masses: readonly number[],
  wallWidth: number,
): Point[] {
  const { strength, maxX, maxY, deadZone } = METAL_MAGNET;
  const radius = magnetRadius(wallWidth);
  return centers.map((center, index) => {
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;
    const distance = Math.hypot(dx, dy);
    const force = distance > deadZone && distance < radius ? 1 - distance / radius : 0;
    const mass = masses[index] ?? 1;
    return {
      x: Math.round(clamp(dx * force * strength * mass, -maxX, maxX) * 10) / 10 || 0,
      y: Math.round(clamp(dy * force * strength * mass, -maxY, maxY) * 10) / 10 || 0,
    };
  });
}

/** Share of the remaining distance an exponential follower covers in `dtMs` (EF-08, τ 60 ms). */
export function followFactor(dtMs: number, tauMs: number = METAL_MAGNET.followTauMs): number {
  return dtMs <= 0 ? 0 : 1 - Math.exp(-dtMs / tauMs);
}

/** Hermite smoothstep of a 0–1 progress: the canvas side of the cross-fade (EF-07). */
export function smoothstep01(progress: number): number {
  const c = clamp(progress, 0, 1);
  return c * c * (3 - 2 * c);
}

/** Minimum time between frames: a 30 fps cap for coarse pointers or few cores (EF-06), else none. */
export function minFrameMs(
  coarsePointer: boolean,
  cores: number,
  lowEndFps: number,
  lowEndCores: number,
) {
  return coarsePointer || cores <= lowEndCores ? 1000 / lowEndFps - 2 : 0;
}

/** GPU names of the software rasterisers (SwiftShader, llvmpipe, WARP…), where the shader is slow. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** True when the WebGL renderer string names a software rasteriser. */
export function isSoftwareRenderer(renderer: string): boolean {
  return SOFTWARE_RENDERER.test(renderer);
}

/**
 * EF-07: the reference fades its logos to metal during the page load, wherever the wall is. We do the
 * same where the shader compiles cheaply (more than `lowEndCores` cores and a hardware GPU); software
 * rasterisers (lab tools, GPU-less VMs) wait for the wall to come near the viewport.
 */
export function canPreheatMetal(cores: number, renderer: string, lowEndCores: number): boolean {
  return cores > lowEndCores && renderer !== '' && !isSoftwareRenderer(renderer);
}
