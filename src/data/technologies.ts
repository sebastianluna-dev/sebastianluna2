import {
  siFigma,
  siFirebase,
  siNextdotjs,
  siPayloadcms,
  siPostgresql,
  siPrisma,
  siReact,
  siTailwindcss,
  siTypescript,
  siVercel,
  siVitest,
  type SimpleIcon,
} from 'simple-icons';

// The logo wall of the home: Sebastian's stack (decisiones.md 3), drawn with
// simple-icons (CC0). Product names, not copy, so they are not translated.
export interface Technology {
  /** Stable id (the simple-icons slug). */
  id: string;
  name: string;
  /** SVG path on a 24×24 viewBox. */
  path: string;
  /** Brand colour, without `#`; the wall paints its own metal, this is only a reference. */
  hex: string;
}

function fromIcon(icon: SimpleIcon): Technology {
  return { id: icon.slug, name: icon.title, path: icon.path, hex: icon.hex };
}

export const TECHNOLOGY_VIEWBOX = '0 0 24 24';

export const TECHNOLOGIES: readonly Technology[] = [
  siReact,
  siNextdotjs,
  siTypescript,
  siTailwindcss,
  siFigma,
  siPayloadcms,
  siPrisma,
  siPostgresql,
  siFirebase,
  siVitest,
  siVercel,
].map(fromIcon);
