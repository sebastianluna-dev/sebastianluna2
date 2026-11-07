import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CASE_SECTION_IDS } from '@/lib/works';

// Case studies, one MDX per language: src/content/works/<locale>/<slug>.mdx.
// The entry id (`es/reto-md`) carries the locale and the slug; there is no
// `slug` field. Prev/next come from `order`, never from the frontmatter.
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
      /** Sebastian's role in the project. */
      role: z.string().min(1),
      /** "Service" column of the case meta. */
      service: z.array(z.string().min(1)).min(1),
      /** "Tools" column of the case meta (the stack). */
      tools: z.array(z.string().min(1)).min(1),
      /** Display years, as the card chip shows them ("2021–2023"). */
      year: z.string().regex(/^\d{4}(–\d{4})?$/),
      /** Live site, or null when it has none. */
      url: z.url().nullable(),
      /** Position in the list and in prev/next (1 = first). Unique per language. */
      order: z.number().int().positive(),
      /** Idle image of the card and the case cover (4:3 crop of a 16:9 capture for now). */
      cover: picture,
      /** Up to three images for the hover zones of the card (left, centre, right). */
      zones: z.array(picture).max(3).default([]),
      /** Fixed sections of the case, in order; ids are anchors and are not translated. */
      sections: z
        .array(z.object({ id: z.enum(CASE_SECTION_IDS), label: z.string().min(1).optional() }))
        .default([]),
      /** Demo keys rendered by the case (phase 5). */
      demos: z.array(z.string().min(1)).default([]),
      draft: z.boolean().default(false),
    });
  },
});

export const collections = { works };
