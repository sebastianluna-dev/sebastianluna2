/**
 * Pure helpers of the `writings` collection (fase7-plan §2): ids, list order, drafts, routes and
 * twins. Like `works.ts`, they take the part of an entry they need so they stay testable without
 * Astro. Drafts are decided here only: no view reads `draft` on its own.
 */
import type { Locale } from '@/i18n/locales';
import { localizePath } from './i18n-paths';
import { parseWorkId } from './works';

/** The part of a `writings` entry these helpers need. */
export interface WritingLike {
  id: string;
  data: { date: Date; order?: number; draft: boolean };
}

export interface WritingListOptions {
  /** Keep drafts (only `astro dev` passes `import.meta.env.DEV`). */
  includeDrafts?: boolean;
}

/** Language-neutral path of the writings index; articles live below it. */
export const WRITINGS_BASE = '/writings';

/** `es/articulo-de-ejemplo` → `{ locale: 'es', slug: 'articulo-de-ejemplo' }` (same pattern as works). */
export function parseWritingId(id: string): { locale: Locale; slug: string } {
  try {
    return parseWorkId(id);
  } catch {
    throw new Error(`Writing id must be <locale>/<slug>, got "${id}"`);
  }
}

export function writingSlug(entry: WritingLike): string {
  return parseWritingId(entry.id).slug;
}

export function writingLocale(entry: WritingLike): Locale {
  return parseWritingId(entry.id).locale;
}

/**
 * List order: entries with `order` first (ascending), then the rest by `date`, newest first; ties
 * by id. Manual and chronological order can be mixed without touching anything else.
 */
export function compareWritings(a: WritingLike, b: WritingLike): number {
  const ao = a.data.order;
  const bo = b.data.order;
  if (ao !== undefined || bo !== undefined) {
    if (ao === undefined) return 1;
    if (bo === undefined) return -1;
    if (ao !== bo) return ao - bo;
  }
  return b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id);
}

/** The writings of one language in list order; drafts are left out unless asked for. */
export function writingsForLocale<T extends WritingLike>(
  entries: readonly T[],
  locale: Locale,
  { includeDrafts = false }: WritingListOptions = {},
): T[] {
  return entries
    .filter((entry) => writingLocale(entry) === locale && (includeDrafts || !entry.data.draft))
    .sort(compareWritings);
}

/** Link to the writings index of a language. */
export function writingsIndexHref(locale: Locale): string {
  return localizePath(WRITINGS_BASE, locale);
}

/** Link to an article in a language. */
export function writingHref(slug: string, locale: Locale): string {
  return localizePath(`${WRITINGS_BASE}/${slug}`, locale);
}

/** `getStaticPaths` of an article route: one page per listed writing of the language. */
export function writingStaticPaths<T extends WritingLike>(
  entries: readonly T[],
  locale: Locale,
  options: WritingListOptions = {},
): { params: { slug: string }; props: { entry: T } }[] {
  return writingsForLocale(entries, locale, options).map((entry) => ({
    params: { slug: writingSlug(entry) },
    props: { entry },
  }));
}

/** The same article in another language (slugs are not translated). */
export function writingCounterpart<T extends WritingLike>(
  entries: readonly T[],
  entry: T,
  target: Locale,
): T | undefined {
  const id = `${target}/${writingSlug(entry)}`;
  return entries.find((candidate) => candidate.id === id);
}

// ------------------------------------------------------------------ article meta (writings-spec §3.9)

/** Words per minute of the reading time (the reference lands between 190 and 220). */
export const READING_WORDS_PER_MINUTE = 200;

/** Locale of the long date of the meta line (`8 de noviembre de 2026`, `November 8, 2026`). */
export const WRITING_DATE_LOCALE: Record<Locale, string> = { es: 'es-MX', en: 'en-US' };

/** Words of a plain text: runs between spaces that hold at least one letter or digit. */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/**
 * Reading time in whole minutes: `override` (the frontmatter `readingMinutes`) wins; otherwise the
 * words at 200 per minute, rounded, never below 1.
 */
export function readingMinutes(text: string, override?: number): number {
  if (override !== undefined) return override;
  return Math.max(1, Math.round(countWords(text) / READING_WORDS_PER_MINUTE));
}

/**
 * Long date of the meta line. Frontmatter dates are calendar days parsed at UTC midnight, so they are
 * formatted in UTC: the day never shifts with the time zone of the build machine.
 */
export function formatWritingDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(WRITING_DATE_LOCALE[locale], {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}

/** `datetime` of the `<time>` element: the calendar day (`2026-11-08`). */
export function writingDateTime(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Skips a JSX tag that starts at `start` (`<Name …>`, `</Name>` or `<Name … />`), attributes with
 * expressions and strings included, and returns the index right after its `>`.
 */
function skipJsxTag(source: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    } else if (char === '>' && depth === 0) {
      return index + 1;
    }
  }
  return source.length;
}

/**
 * The prose of an MDX body, for the reading time: without imports and exports, fenced code, JSX tags
 * (with their attributes, so a chat's props do not count; the text between tags does), HTML comments,
 * images, link targets and Markdown punctuation.
 */
export function bodyText(mdx: string): string {
  const withoutBlocks = mdx
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\S\n]*$/gmu, ' ')
    .replace(/^(?:import|export)\s[^\n]*$/gmu, ' ')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/gu, ' ');
  let text = '';
  for (let index = 0; index < withoutBlocks.length;) {
    const char = withoutBlocks[index];
    if (char === '<' && /[A-Za-z/]/u.test(withoutBlocks[index + 1] ?? '')) {
      index = skipJsxTag(withoutBlocks, index);
      text += ' ';
    } else {
      text += char;
      index += 1;
    }
  }
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/`([^`]*)`/gu, '$1')
    .replace(/^\s*(?:#{1,6}|[-*+]|\d+\.|>)\s+/gmu, '')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/gmu, ' ')
    .replace(/[|*_~]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

// ------------------------------------------------------------------ article body helpers

/** True for a link that leaves the site (another origin over http or https). */
export function isExternalHref(href: string, site: string): boolean {
  if (!/^https?:\/\//iu.test(href)) return false;
  try {
    return new URL(href).origin !== new URL(site).origin;
  } catch {
    return false;
  }
}

/** Display names of the code languages; any other id shows in capitals (`html` → `HTML`). */
const CODE_LANGUAGE_NAMES: Record<string, string> = {
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  sh: 'Shell',
  bash: 'Bash',
  shell: 'Shell',
  md: 'Markdown',
  mdx: 'MDX',
  plaintext: 'Text',
  text: 'Text',
  txt: 'Text',
};

/** Label of a code block header: its language name. */
export function codeLanguageLabel(language: string | undefined): string {
  const id = (language ?? '').trim().toLowerCase();
  if (!id) return CODE_LANGUAGE_NAMES.text!;
  return CODE_LANGUAGE_NAMES[id] ?? id.toUpperCase();
}

/** Width of the line-number gutter in `ch`: the digits of the last line plus one (writings-spec §3.6). */
export function codeGutterCh(lineCount: number): number {
  return String(Math.max(1, Math.floor(lineCount))).length + 1;
}

/** Lines of the Shiki output (one `<span class="line">` each). */
export function countCodeLines(html: string): number {
  return (html.match(/<span class="line"/gu) ?? []).length;
}

/** The author emoji of the footer: the first one in the SSR, a random one once mounted. */
export function pickEmoji(set: readonly string[], random: () => number = Math.random): string {
  if (set.length === 0) return '';
  const index = Math.min(set.length - 1, Math.floor(random() * set.length));
  return set[index]!;
}
