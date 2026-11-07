/**
 * Marks of the technology wall: which technologies are set as a wordmark (glyph + name) and how big
 * each one sits in the grid (EF-06; the grid rhythm of the reference, rows of 4 / 3 / 4).
 */
import type { Technology } from '@/data/technologies';
import { MARK_SIZING } from './tuning';
import { WORDMARKS } from './wordmarks';

/** Per technology: size relative to the base unit, magnet mass and optional caps. */
export interface MarkStyle {
  scale: number;
  mass: number;
  /** Width cap before the size multiplier (default `MARK_SIZING.widthCap`). */
  widthCap?: number;
  /** Height cap in px (default `MARK_SIZING.maxHeight`). */
  maxHeight?: number;
}

const ICON: MarkStyle = { scale: 1.25, mass: 1 };

/** Keyed by simple-icons slug. Unknown technologies fall back to a plain icon. */
export const MARK_STYLES: Readonly<Record<string, MarkStyle>> = {
  react: { scale: 0.9, mass: 1.12 },
  nextdotjs: { scale: 1.25, mass: 0.84 },
  typescript: { scale: 0.78, mass: 0.92 },
  tailwindcss: { scale: 1.2, mass: 1.08 },
  figma: { scale: 1.4, mass: 0.88, maxHeight: 42 },
  payloadcms: { scale: 1, mass: 1, widthCap: 136 },
  prisma: { scale: 0.86, mass: 0.96 },
  postgresql: { scale: 1.25, mass: 1.04 },
  firebase: { scale: 1.25, mass: 0.9 },
  vitest: { scale: 0.74, mass: 1.06 },
  vercel: { scale: 1.2, mass: 0.94 },
};

/** Grid positions that span 4 of the 12 columns (the middle row); the rest span 3. */
export const WIDE_SLOTS: readonly number[] = [4, 5, 6];

export interface WallMark {
  id: string;
  /** Accessible name. */
  name: string;
  viewBox: string;
  /** viewBox width / height. */
  ratio: number;
  /** Glyph path (24×24 box) and its transform inside the viewBox (`undefined` = identity). */
  iconPath: string;
  iconTransform?: string;
  /** Name outlines of a wordmark. */
  namePath?: string;
  /** Box width and height cap, px (the box keeps `ratio` until the cap squeezes it). */
  width: number;
  maxHeight: number;
  mass: number;
  wide: boolean;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** Width of a mark box: min(cap, unit × scale × ratio) × size factor. */
export function markWidth(style: MarkStyle, ratio: number): number {
  const cap = style.widthCap ?? MARK_SIZING.widthCap;
  return round(Math.min(cap, MARK_SIZING.unit * style.scale * ratio) * MARK_SIZING.sizeFactor);
}

export function buildMarks(technologies: readonly Technology[], iconViewBox: string): WallMark[] {
  return technologies.map((tech, index) => {
    const style = MARK_STYLES[tech.id] ?? ICON;
    const wordmark = WORDMARKS[tech.id];
    const ratio = wordmark ? wordmark.ratio : 1;
    return {
      id: tech.id,
      name: tech.name,
      viewBox: wordmark?.viewBox ?? iconViewBox,
      ratio,
      iconPath: tech.path,
      iconTransform: wordmark ? `scale(${wordmark.icon.scale})` : undefined,
      namePath: wordmark?.name,
      width: markWidth(style, ratio),
      maxHeight: style.maxHeight ?? MARK_SIZING.maxHeight,
      mass: style.mass,
      wide: WIDE_SLOTS.includes(index),
    };
  });
}
