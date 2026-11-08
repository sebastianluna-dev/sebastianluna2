/**
 * Outline of a case study MDX source, read as text (no MDX compiler): what each section holds, so the
 * tests can check that both languages of a case have the same structure and that every image and
 * demo is well formed. It only understands the components of `@/components/portfolio/case` written
 * as README "Writing a case study" shows them.
 */

/** One `<Figure>`: `src` is the module path of its imported image, or null for a placeholder. */
export interface OutlineFigure {
  src: string | null;
  alt: string;
  appear: string | null;
}

export interface OutlineSection {
  id: string;
  subsections: number;
  galleries: string[];
  figures: OutlineFigure[];
  /** Number of messages of each chat aside. */
  chats: number[];
  /** Number of notes of each side-notes row. */
  notes: number[];
  demos: string[];
  h3: number;
}

export interface CaseOutline {
  sections: OutlineSection[];
  /** Keys of the frontmatter `demos`. */
  frontmatterDemos: string[];
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;

/** Value of an attribute written as `name="…"`, `name='…'` or `name={'…'}` / `name={"…"}`. */
function stringAttribute(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\s${name}=(?:"([^"]*)"|'([^']*)'|\\{\\s*(?:"([^"]*)"|'([^']*)')\\s*\\})`,
  ).exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
}

/** Value of an attribute written as an expression, `name={value}`. */
function expressionAttribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}=\\{\\s*([\\w.$]+)\\s*\\}`).exec(tag);
  return match ? match[1]! : null;
}

function resolveImage(name: string | null, images: Map<string, string>): string | null {
  if (name === null) return null;
  const path = images.get(name);
  if (!path) throw new Error(`Figure src {${name}} is not an imported image`);
  return path;
}

/** Opening tags of a component (self-closing or not), across lines. */
function openingTags(source: string, component: string): string[] {
  return [...source.matchAll(new RegExp(`<${component}(?=[\\s/>])[\\s\\S]*?(?<!=)>`, 'g'))].map(
    (match) => match[0],
  );
}

/** The `<ChatAside … />` elements, multi-line as Prettier writes them: the closing `/>` starts a line. */
function chatMessageCounts(source: string): number[] {
  const counts: number[] = [];
  for (const match of source.matchAll(/<ChatAside\b([\s\S]*?)^\s*\/>/gm)) {
    counts.push([...match[1]!.matchAll(/\bfrom:\s*['"](?:visitor|sebastian)['"]/g)].length);
  }
  return counts;
}

function noteCounts(source: string): number[] {
  return [...source.matchAll(/<SideNotes\b[\s\S]*?<\/SideNotes>/g)].map(
    (match) => [...match[0].matchAll(/<SideNote(?=[\s>])/g)].length,
  );
}

/** `import shot from '@/assets/…';` → `{ shot: '@/assets/…' }`. */
function imageImports(source: string): Map<string, string> {
  return new Map(
    [...source.matchAll(/^import\s+([\w$]+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm)].map(
      (match) => [match[1]!, match[2]!] as const,
    ),
  );
}

function sectionOutline(id: string, source: string, images: Map<string, string>): OutlineSection {
  // Chat messages may contain any text, so they are dropped before reading the other tags.
  const withoutChats = source.replace(/<ChatAside\b[\s\S]*?^\s*\/>/gm, '');
  return {
    id,
    subsections: openingTags(withoutChats, 'CaseSubsection').length,
    galleries: openingTags(withoutChats, 'Gallery').map(
      (tag) => stringAttribute(tag, 'variant') ?? '',
    ),
    figures: openingTags(withoutChats, 'Figure').map((tag) => ({
      src: resolveImage(expressionAttribute(tag, 'src'), images),
      alt: stringAttribute(tag, 'alt') ?? '',
      appear: stringAttribute(tag, 'appear'),
    })),
    chats: chatMessageCounts(source),
    notes: noteCounts(withoutChats),
    demos: openingTags(withoutChats, 'DemoSlot').map((tag) => stringAttribute(tag, 'name') ?? ''),
    h3: [...withoutChats.matchAll(/^###\s/gm)].length,
  };
}

/**
 * Markdown headings of level 1–3 written inside a `<CaseSubsection>`: its kicker is already the h3,
 * so anything inside must be `####` or deeper (design-spec §7, no skipped or flattened levels).
 */
export function headingsInSubsections(source: string): string[] {
  const withoutChats = source.replace(/<ChatAside\b[\s\S]*?^\s*\/>/gm, '');
  return [...withoutChats.matchAll(/<CaseSubsection\b[\s\S]*?<\/CaseSubsection>/g)].flatMap(
    (match) => [...match[0].matchAll(/^#{1,3}\s.*$/gm)].map((heading) => heading[0]),
  );
}

/** Outline of the MDX `source` of one case study in one language. */
export function caseOutline(source: string): CaseOutline {
  const frontmatter = FRONTMATTER.exec(source)?.[1] ?? '';
  const demosLine = /^demos:\s*\[(.*)\]\s*$/m.exec(frontmatter)?.[1] ?? '';
  const frontmatterDemos = [...demosLine.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]!);
  const body = source.slice(FRONTMATTER.exec(source)?.[0].length ?? 0);
  const images = imageImports(body);
  const starts = [...body.matchAll(/<CaseSection\s+id="([\w-]+)"/g)];
  const sections = starts.map((match, index) =>
    sectionOutline(
      match[1]!,
      body.slice(match.index, starts[index + 1]?.index ?? body.length),
      images,
    ),
  );
  return { sections, frontmatterDemos };
}

/**
 * The structure of an outline without its copy: what must be equal in both languages of a case
 * (sections, subsections, galleries, figure slots and appears, messages per chat, notes per row,
 * demo names, h3 count).
 */
export function outlineShape(outline: CaseOutline) {
  return {
    frontmatterDemos: outline.frontmatterDemos,
    sections: outline.sections.map((section) => ({
      ...section,
      figures: section.figures.map(({ src, appear }) => ({ src, appear })),
    })),
  };
}
