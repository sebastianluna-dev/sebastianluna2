import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { SITE_URL } from './src/data/site';

// Everything is prerendered; only the routes that export `prerender = false`
// (the Blue chat endpoint) become Vercel functions.
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // No trailing slash anywhere (design-spec §9.3, RT-14): canonicals and alternates match.
  trailingSlash: 'never',
  adapter: vercel({ maxDuration: 30 }),
  // Astro 7 defaults to 'jsx', which strips the whitespace between inline siblings.
  compressHTML: true,
  integrations: [
    react(),
    mdx(),
    sitemap({ i18n: { defaultLocale: 'es', locales: { es: 'es-MX', en: 'en' } } }),
  ],
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  vite: {
    // Lets several dev servers run side by side without sharing the dep optimizer cache.
    cacheDir: process.env.VITE_CACHE_DIR ?? 'node_modules/.vite',
  },
  env: {
    schema: {
      ANTHROPIC_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
      BLUE_IP_SALT: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
