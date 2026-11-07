/**
 * Production host, the single source for `site` in astro.config.ts and the canonicals of
 * `@/lib/i18n-paths`. Never the bare domain, which redirects. No imports: the config loads it raw.
 */
export const SITE_URL = 'https://www.sebastianluna.dev';
