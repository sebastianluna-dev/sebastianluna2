import {
  siClaude,
  siEslint,
  siFigma,
  siGit,
  siGithub,
  siJest,
  siLighthouse,
  siNextdotjs,
  siNodedotjs,
  siPayloadcms,
  siPostgresql,
  siPrisma,
  siRadixui,
  siReact,
  siShadcnui,
  siStorybook,
  siTailwindcss,
  siTypescript,
  siVercel,
  siVitest,
  type SimpleIcon,
} from 'simple-icons';

// The /about "My toolkit" folder (fase7-plan §1.3): five collections of Sebastian's tools, all from the
// "Herramientas principales" of his CVs (fuentes-about.md §10; Claude Code from the CV-ES profile).
// Tool names are product names, so they are not translated; collection names live in
// `about.toolkit.collections`. Logos are simple-icons (CC0), drawn as provisional sticker stamps.

export type ToolkitCollectionId = 'interface' | 'design' | 'data' | 'quality' | 'shipping';

export interface ToolkitTool {
  /** simple-icons slug. */
  id: string;
  /** Visible name (floating tag) and the stamp's accessible name. */
  name: string;
  /** SVG path on a 24 × 24 viewBox. */
  path: string;
  /** Brand colour with `#`. */
  color: string;
}

export interface ToolkitCollection {
  id: ToolkitCollectionId;
  /** 1-based lamp colour: `--pf-folder-lamp-<n>`. */
  lamp: 1 | 2 | 3 | 4 | 5;
  tools: ToolkitTool[];
}

function tool(icon: SimpleIcon, name: string = icon.title): ToolkitTool {
  return { id: icon.slug, name, path: icon.path, color: `#${icon.hex}` };
}

export const TOOLKIT: ToolkitCollection[] = [
  {
    id: 'interface',
    lamp: 1,
    tools: [tool(siReact), tool(siNextdotjs), tool(siTypescript), tool(siTailwindcss)],
  },
  {
    id: 'design',
    lamp: 2,
    tools: [tool(siFigma), tool(siStorybook), tool(siRadixui), tool(siShadcnui)],
  },
  {
    id: 'data',
    lamp: 3,
    tools: [tool(siNodedotjs), tool(siPrisma), tool(siPostgresql), tool(siPayloadcms)],
  },
  {
    id: 'quality',
    lamp: 4,
    tools: [tool(siVitest), tool(siJest), tool(siLighthouse), tool(siEslint)],
  },
  {
    id: 'shipping',
    lamp: 5,
    tools: [tool(siGit), tool(siGithub), tool(siVercel), tool(siClaude, 'Claude Code')],
  },
];
