import { DEFAULT_LOCALE, HREFLANG, LOCALES, type Locale } from '@/i18n/locales';
import { SITE_URL } from '@/data/site';

export { SITE_URL };

/** URL prefix of a language: none for English, `/es` for Spanish. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/** Drops the trailing slash (the site uses `trailingSlash: 'never'`), keeping `/`. */
export function normalizePath(path: string): string {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') || '/' : withSlash;
}

/** Splits a pathname into its language and the language-neutral path (`/es/works/x` → `es`, `/works/x`). */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const path = normalizePath(pathname);
  for (const locale of LOCALES) {
    const prefix = localePrefix(locale);
    if (!prefix) continue;
    if (path === prefix) return { locale, path: '/' };
    if (path.startsWith(`${prefix}/`)) return { locale, path: path.slice(prefix.length) };
  }
  return { locale: DEFAULT_LOCALE, path };
}

/**
 * Puts a language-neutral href in a language: `/works/x` → `/es/works/x`,
 * `/#works` → `/es#works`. Query and hash are kept.
 */
export function localizePath(href: string, locale: Locale): string {
  const match = /^([^?#]*)(.*)$/.exec(href);
  const path = normalizePath(match?.[1] || '/');
  const rest = match?.[2] ?? '';
  const prefix = localePrefix(locale);
  if (!prefix) return `${path}${rest}`;
  return `${path === '/' ? prefix : `${prefix}${path}`}${rest}`;
}

/** The same page in another language. */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localizePath(splitLocale(pathname).path, target);
}

/** Absolute URL on the production host. */
export function absoluteUrl(href: string): string {
  return new URL(href, SITE_URL).href;
}

/** Canonical URL of a pathname. */
export function canonicalUrl(pathname: string): string {
  return absoluteUrl(normalizePath(pathname));
}

export interface Alternate {
  hreflang: string;
  href: string;
}

/** `<link rel="alternate">` entries: one per language plus `x-default` (English). */
export function alternates(pathname: string): Alternate[] {
  const { path } = splitLocale(pathname);
  return [
    ...LOCALES.map((locale) => ({
      hreflang: HREFLANG[locale],
      href: absoluteUrl(localizePath(path, locale)),
    })),
    { hreflang: 'x-default', href: absoluteUrl(localizePath(path, DEFAULT_LOCALE)) },
  ];
}
