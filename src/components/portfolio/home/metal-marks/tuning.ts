/**
 * Every number of the technology wall's liquid metal (EF-06…EF-08, efectos-y-demos.md §2.2), in one
 * place so the renderer, the bootstrap and the tests share them. The shader itself is our own; these
 * are the measured behaviours it is tuned to reproduce.
 */
import type { ThemeName } from '@/components/portfolio/theme/theme.inline';

/** Look of the metal per theme (EF-06). Colours are linear 0–1 RGB triples. */
export interface MetalTuning {
  /** Flow speed: shader time units per second. */
  speed: number;
  /** Chromatic split of the R and B channels, in band units. */
  dispersion: number;
  /** Turbulence of the bands near the outline. */
  edge: number;
  /** Extra softness of the band edges, in band units. */
  blur: number;
  /** Turbulence of the bands over the whole mark. */
  liquid: number;
  /** Bands per unit of mark height. */
  scale: number;
  /** Global alpha of the canvas marks. */
  alpha: number;
  /** Contrast of the chrome ramp around its middle (1 = as is). */
  contrast: number;
  /** Shift of the chrome ramp towards the bright end. */
  lift: number;
  /** Bright end of the chrome ramp. */
  high: readonly [number, number, number];
  /** Dark end of the chrome ramp. */
  low: readonly [number, number, number];
}

const hex = (value: number): readonly [number, number, number] => [
  ((value >> 16) & 255) / 255,
  ((value >> 8) & 255) / 255,
  (value & 255) / 255,
];

// EF-06: speed .18, dispersion .01/.012, edge .34/.36, pattern blur .006, liquid .05,
// pattern scale 2.2, global alpha .9/.82; light metal is a blue-grey steel, dark metal is near white.
export const METAL_TUNING: Readonly<Record<ThemeName, MetalTuning>> = {
  light: {
    speed: 0.18,
    dispersion: 0.01,
    edge: 0.34,
    blur: 0.006,
    liquid: 0.05,
    scale: 2.2,
    alpha: 0.9,
    contrast: 1,
    lift: 0,
    high: hex(0xa6a8b6),
    low: hex(0x0e1024),
  },
  dark: {
    speed: 0.18,
    dispersion: 0.012,
    edge: 0.36,
    blur: 0.006,
    liquid: 0.05,
    scale: 2.2,
    alpha: 0.82,
    contrast: 1.35,
    lift: 0,
    high: hex(0xf6f6ff),
    low: hex(0x0a0b26),
  },
};

/** Mounting and frame pacing (EF-06). */
export const METAL_RUNTIME = {
  /**
   * EF-07 trigger. Once the page has loaded and the main thread is idle (timeout in ms), devices that
   * pass `canPreheatMetal` (hardware GPU, more than `lowEndCores` cores) mount the renderer at once,
   * wherever the wall is, so the 700 ms fade is over before anyone scrolls to it (as in the
   * reference). The rest mount only when the wall reaches the viewport: compiling the shader on a
   * software GPU (lab tools) costs seconds of main thread (Lighthouse mobile, Phase 3). Those keep
   * the grey DOM logos until then and fade in view.
   */
  mountIdleTimeoutMs: 2000,
  mountRootMargin: '0px',
  /** Device pixel ratio cap of the canvas. */
  maxDpr: 2,
  /** Frame rate cap with a coarse pointer or ≤ `lowEndCores` cores (0 = every frame). */
  lowEndFps: 30,
  lowEndCores: 4,
  /** A long frame never advances the simulation more than this (ms). */
  maxFrameMs: 64,
} as const;

/** DOM → canvas cross-fade (EF-07): DOM opacity → 0 by CSS, canvas alpha smoothstep(fade). */
export const METAL_FADE_MS = 700;

/** Pointer magnetism (EF-08). */
export const METAL_MAGNET = {
  /** Pull strength. */
  strength: 0.28,
  /** Influence radius: clamp(min, factor × wall width, max), px. */
  radiusMin: 96,
  radiusFactor: 0.36,
  radiusMax: 180,
  /** Offset caps, px. */
  maxX: 5,
  maxY: 4,
  /** Below this distance (px) the pointer sits on the centre and does not pull. */
  deadZone: 1,
  /** Canvas follow: exponential filter time constant (ms). */
  followTauMs: 60,
} as const;

/** Rasterisation of each mark for the bevel field (EF-06). */
export const METAL_RASTER = {
  /** Clear margin around the shape, as a fraction of its long side. */
  margin: 0.07,
  /** Texture long side, px. */
  longSide: 500,
  /** The short side is raised to at least this many px… */
  minShortSide: 220,
  /** …without the long side passing this. */
  maxLongSide: 1400,
  /** Alpha (0–255) from which a pixel counts as inside the shape. */
  insideAlpha: 128,
  /** Smoothing of the bevel ridges: box blur radius as a fraction of the texture long side. */
  smoothing: 0.012,
} as const;

/** Wall sizing of the DOM marks (the reference's `logoSize` 8 on a base of 7). */
export const MARK_SIZING = {
  /** Width per unit of `scale × ratio`, px. */
  unit: 30,
  /** Global size multiplier. */
  sizeFactor: 8 / 7,
  /** Default width cap before the multiplier, px. */
  widthCap: 112,
  /** Default height cap, px. */
  maxHeight: 34,
} as const;
