// The two languages of the site. Spanish lives at the root, English under /en.
export const LOCALES = ['es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

/** `lang` of <html>. */
export const HTML_LANG: Record<Locale, string> = { es: 'es', en: 'en' };

/** `hreflang` of the alternates; the same codes the sitemap integration uses. */
export const HREFLANG: Record<Locale, string> = { es: 'es-MX', en: 'en' };

/** `og:locale`. */
export const OG_LOCALE: Record<Locale, string> = { es: 'es_MX', en: 'en_US' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
