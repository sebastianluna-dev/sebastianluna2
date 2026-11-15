import { readdirSync } from 'node:fs';
import { defineConfig, envField } from 'astro/config';
import type { AstroIntegration } from 'astro';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { SITE_URL } from './src/data/site';

/**
 * Pages that exist only under `astro dev` (src/dev/pages): working tools such as the mockup lab.
 * Injected here, and not placed in src/pages, so a build never emits them.
 */
const devPages: AstroIntegration = {
  name: 'dev-pages',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev') return;
      injectRoute({ pattern: '/dev/mockups', entrypoint: './src/dev/pages/mockups.astro' });
      // The copy editor saves a corrected text into its MDX file through this endpoint.
      injectRoute({ pattern: '/dev/api/copy', entrypoint: './src/dev/pages/copy-api.ts' });
      // One preview per demo of a case, at the two widths a case shows it: every page of
      // src/dev/pages/demos becomes /dev/demos/<name>.
      for (const page of readdirSync(new URL('./src/dev/pages/demos', import.meta.url))) {
        if (!page.endsWith('.astro')) continue;
        injectRoute({
          pattern: `/dev/demos/${page.replace(/\.astro$/, '')}`,
          entrypoint: `./src/dev/pages/demos/${page}`,
        });
      }
    },
  },
};

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
    sitemap({ i18n: { defaultLocale: 'en', locales: { es: 'es-MX', en: 'en' } } }),
    devPages,
  ],
  // Code blocks of the writings (fase7-plan §2.7): Shiki paints `--astro-code-*` variables, which
  // CodeBlock maps onto the `--pf-code-*` tokens (light and dark, no client JS). MDX inherits it; the
  // case studies have no code blocks.
  markdown: {
    shikiConfig: { theme: 'css-variables', wrap: true },
  },
  // English moved to the root and Spanish to /es (decisiones.md 32): the old English URLs answer
  // with a permanent redirect to the same page, so shared links keep working.
  redirects: {
    '/en': '/',
    '/en/about': '/about',
    '/en/works/[slug]': '/works/[slug]',
    '/en/writings': '/writings',
    '/en/writings/[slug]': '/writings/[slug]',
  },
  i18n: {
    defaultLocale: 'en',
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
