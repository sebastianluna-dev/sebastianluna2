import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { META_DESCRIPTION_MAX } from '@/lib/works';

// Case studies, one MDX per language: src/content/works/<locale>/<slug>.mdx.
// The entry id (`es/reto-md`) carries the locale and the slug; there is no
// `slug` field. Prev/next come from `order`, never from the frontmatter. The six
// sections of a case are fixed (CASE_SECTION_IDS in @/lib/works) and live in the
// MDX body as <CaseSection id="…">; the frontmatter does not list them.
const works = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/works' }),
  schema: ({ image }) => {
    const picture = z.object({ src: image(), alt: z.string().min(1) });
    return z.object({
      /** Project name: card chip, case h1 and prev/next. */
      title: z.string().min(1),
      /** Line above the title of the case (badge). */
      kicker: z.string().min(1),
      /** One or two sentences: meta description and Blue's context. */
      summary: z.string().min(1),
      /** Meta description when the summary is longer than search results show (≤ 160). */
      description: z.string().min(1).max(META_DESCRIPTION_MAX).optional(),
      /** Sebastian's role in the project. */
      role: z.string().min(1),
      /** "Service" column of the case meta. */
      service: z.array(z.string().min(1)).min(1),
      /** "Tools" column of the case meta (the stack). */
      tools: z.array(z.string().min(1)).min(1),
      /** Display years, as the card chip shows them ("2021–2023", or "2020–2021 · 2025" for a rebuild). */
      year: z.string().regex(/^\d{4}(–\d{4})?( · \d{4}(–\d{4})?)?$/),
      /** Live site, or null when it has none. */
      url: z.url().nullable(),
      /** Position in the list and in prev/next (1 = first). Unique per language. */
      order: z.number().int().positive(),
      /** Idle image of the card and the case cover (4:3 crop of a 16:9 capture for now). */
      cover: picture,
      /** Up to three images for the hover zones of the card (left, centre, right). */
      zones: z.array(picture).max(3).default([]),
      /** Demo keys rendered by the case (phase 5; each one also marked with <DemoSlot> in the body). */
      demos: z.array(z.string().min(1)).default([]),
      draft: z.boolean().default(false),
    });
  },
});

// Writings (fase7-plan §2.1), one MDX per language: src/content/writings/<locale>/<slug>.mdx, with
// the same id pattern as `works` (`es/<slug>`; no `slug` field, slugs are not translated). Every
// article needs its twin in the other language. Drafts only exist in `astro dev`: the lists and the
// routes go through `writingsForLocale` / `writingStaticPaths` in @/lib/writings, never `draft` itself.
const writings = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/writings' }),
  schema: ({ image }) =>
    z.object({
      /** h1 of the article, title of its card and of the document. */
      title: z.string().min(1),
      /** Card excerpt (clamped to one line) and meta description. */
      description: z.string().min(1).max(META_DESCRIPTION_MAX),
      /** Publication date: <time datetime>, article:published_time and the default order. */
      date: z.coerce.date(),
      /** Last substantive edit: article:modified_time. */
      updated: z.coerce.date().optional(),
      /** Only for article:tag metadata; never rendered (the reference shows no tags). */
      tags: z.array(z.string().min(1)).default([]),
      /** Share image (og:image) only; the page paints no cover, like the reference. */
      cover: z.object({ src: image(), alt: z.string().min(1) }).optional(),
      /** Overrides the computed reading time (minutes). */
      readingMinutes: z.number().int().positive().optional(),
      /** Manual position in the lists (1 = first); without it, newest first. */
      order: z.number().int().positive().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { works, writings };
