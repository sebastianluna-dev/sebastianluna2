import { isLocale, type Locale } from '@/i18n/locales';
import { localizePath } from './i18n-paths';

/** Fixed sections of a case study; their ids are the anchors (design-spec §3.2). */
export const CASE_SECTION_IDS = [
  'overview',
  'challenge',
  'approach',
  'research',
  'design',
  'outcome',
] as const;

export type CaseSectionId = (typeof CASE_SECTION_IDS)[number];

/** The part of a `works` entry these helpers need, so they stay testable without Astro. */
export interface WorkLike {
  id: string;
  data: { order: number; draft: boolean };
}

/** `es/reto-md` → `{ locale: 'es', slug: 'reto-md' }`. */
export function parseWorkId(id: string): { locale: Locale; slug: string } {
  const [locale, slug, ...rest] = id.split('/');
  if (!isLocale(locale) || !slug || rest.length > 0) {
    throw new Error(`Work id must be <locale>/<slug>, got "${id}"`);
  }
  return { locale, slug };
}

export function workSlug(entry: WorkLike): string {
  return parseWorkId(entry.id).slug;
}

export function workLocale(entry: WorkLike): Locale {
  return parseWorkId(entry.id).locale;
}

/** The works of one language in list order; drafts are left out unless asked for. */
export function worksForLocale<T extends WorkLike>(
  entries: readonly T[],
  locale: Locale,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): T[] {
  return entries
    .filter((entry) => workLocale(entry) === locale && (includeDrafts || !entry.data.draft))
    .sort((a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id));
}

/** Neighbours in an ordered list, without wrapping: the first has no previous, the last no next. */
export function prevNext<T extends WorkLike>(
  ordered: readonly T[],
  slug: string,
): { previous: T | null; next: T | null } {
  const index = ordered.findIndex((entry) => workSlug(entry) === slug);
  if (index === -1) return { previous: null, next: null };
  return { previous: ordered[index - 1] ?? null, next: ordered[index + 1] ?? null };
}

/** The same work in another language (slugs are not translated). */
export function counterpart<T extends WorkLike>(
  entries: readonly T[],
  entry: T,
  target: Locale,
): T | undefined {
  const id = `${target}/${workSlug(entry)}`;
  return entries.find((candidate) => candidate.id === id);
}

/** Link to a case study in a language. */
export function workHref(slug: string, locale: Locale): string {
  return localizePath(`/works/${slug}`, locale);
}

/** `getStaticPaths` of a case route: one page per published work of the language, in list order. */
export function workStaticPaths<T extends WorkLike>(
  entries: readonly T[],
  locale: Locale,
): { params: { slug: string }; props: { entry: T } }[] {
  return worksForLocale(entries, locale).map((entry) => ({
    params: { slug: workSlug(entry) },
    props: { entry },
  }));
}

/** A neighbour case as the prev/next cards need it. */
export interface CaseNeighbour {
  title: string;
  href: string;
}

/** Previous and next case of `slug` as links (by `order`, without wrapping; CA-16). */
export function caseNeighbours<T extends WorkLike & { data: { title: string } }>(
  ordered: readonly T[],
  slug: string,
  locale: Locale,
): { previous: CaseNeighbour | null; next: CaseNeighbour | null } {
  const { previous, next } = prevNext(ordered, slug);
  const link = (entry: T | null): CaseNeighbour | null =>
    entry ? { title: entry.data.title, href: workHref(workSlug(entry), locale) } : null;
  return { previous: link(previous), next: link(next) };
}

/**
 * Attribute on the root element of every case block that leaves the text column (Figure, Gallery,
 * DemoSlot, CaseSubsection). Chat asides and side notes do not carry it: they sit inside the body.
 */
export const CASE_BLOCK_ATTR = 'data-case-block';

/**
 * Splits the rendered HTML of a case section (or subsection) at its first block: the prose before it
 * is the body (one appear, in the 560 text column, CA-01), the rest are the blocks of the section
 * (scenes, galleries, subsections), laid out with the block gap. The marker is matched only as an
 * attribute of an opening tag, so the same words in a text node never split.
 */
export function splitLeadingProse(
  html: string,
  attr: string = CASE_BLOCK_ATTR,
): { prose: string; rest: string } {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opening = new RegExp(`<[a-zA-Z][\\w:-]*(?:\\s[^<>]*?)?\\s${escaped}(?=[\\s=/>])`);
  const match = opening.exec(html);
  if (!match) return { prose: html.trim(), rest: '' };
  return { prose: html.slice(0, match.index).trim(), rest: html.slice(match.index).trim() };
}

/** Search engines cut a meta description at about this many characters. */
export const META_DESCRIPTION_MAX = 160;

/** Meta description of a case: its own `description`, else the `summary` (both ≤ 160 in the MDX). */
export function metaDescription(data: { summary: string; description?: string }): string {
  return data.description ?? data.summary;
}
