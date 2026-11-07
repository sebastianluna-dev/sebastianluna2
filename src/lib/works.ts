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
