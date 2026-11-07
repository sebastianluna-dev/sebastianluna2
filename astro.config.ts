import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// Everything is prerendered; only the routes that export `prerender = false`
// (the Blue chat endpoint) become Vercel functions.
export default defineConfig({
  site: 'https://www.sebastianluna.dev',
  output: 'static',
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
    },
  },
});
