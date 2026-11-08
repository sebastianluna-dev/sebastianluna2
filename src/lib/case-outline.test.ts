import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CASE_FIGURE_APPEAR } from '@/components/motion/presets';
import { SIDE_NOTE_ARTS } from '@/components/portfolio/case/types';
import { caseOutline, headingsInSubsections, outlineShape } from './case-outline';
import { CASE_SECTION_IDS } from './works';

const SAMPLE = `---
title: 'X'
demos: ['one', 'two']
---

import { CaseSection, Figure, Gallery } from '@/components/portfolio/case';
import shot from '@/assets/works/x/shot.jpg';

<CaseSection id="overview" title="A">

Text.

### An h3

<ChatAside
  meta="mar 20:15"
  messages={[
    { from: 'visitor', text: 'Is <Figure alt="x" /> text?' },
    { from: 'sebastian', text: 'Yes > no', fx: 'slam' },
  ]}
/>

<DemoSlot name="one" caption="Demo" />

</CaseSection>

<CaseSection id="challenge" title="B">

<SideNotes label="Notes" cols={2}>
  <SideNote title="T" art="board">One.</SideNote>
  <SideNote title="U" art="gauge">Two.</SideNote>
</SideNotes>

<CaseSubsection kicker="K" appear>

<Gallery variant="pair">
  <Figure src={shot} alt="A capture" appear="researchFirst" />
  <Figure
    alt={'A placeholder'}
  />
</Gallery>

</CaseSubsection>

<DemoSlot name="two" />

</CaseSection>
`;

describe('caseOutline', () => {
  it('reads sections, blocks, chats, notes and demos', () => {
    const outline = caseOutline(SAMPLE);
    expect(outline.frontmatterDemos).toEqual(['one', 'two']);
    expect(outline.sections).toEqual([
      {
        id: 'overview',
        subsections: 0,
        galleries: [],
        figures: [],
        chats: [2],
        notes: [],
        demos: ['one'],
        h3: 1,
      },
      {
        id: 'challenge',
        subsections: 1,
        galleries: ['pair'],
        figures: [
          { src: '@/assets/works/x/shot.jpg', alt: 'A capture', appear: 'researchFirst' },
          { src: null, alt: 'A placeholder', appear: null },
        ],
        chats: [],
        notes: [2],
        demos: ['two'],
        h3: 0,
      },
    ]);
  });

  it('rejects a figure whose src is not an imported image', () => {
    expect(() => caseOutline(SAMPLE.replace('src={shot}', 'src={missing}'))).toThrow(/missing/);
  });

  it('drops the copy in the shape compared across languages', () => {
    const shape = outlineShape(caseOutline(SAMPLE));
    expect(shape.sections[1]!.figures).toEqual([
      { src: '@/assets/works/x/shot.jpg', appear: 'researchFirst' },
      { src: null, appear: null },
    ]);
  });
});

describe('headingsInSubsections', () => {
  it('finds the h1–h3 written inside a subsection and ignores deeper ones and the rest', () => {
    const source = [
      '### Outside',
      '<CaseSubsection kicker="K">',
      '### Inside',
      '#### Deeper',
      '</CaseSubsection>',
    ].join('\n');
    expect(headingsInSubsections(source)).toEqual(['### Inside']);
  });
});

describe('case study content (src/content/works)', () => {
  const root = join(process.cwd(), 'src/content/works');
  const read = (locale: string, slug: string) =>
    readFileSync(join(root, locale, `${slug}.mdx`), 'utf8');
  const slugs = readdirSync(join(root, 'es'))
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));

  it.each(slugs)('%s has the six sections in order in both languages', (slug) => {
    for (const locale of ['es', 'en']) {
      const ids = caseOutline(read(locale, slug)).sections.map((section) => section.id);
      expect(ids, `${locale}/${slug}`).toEqual([...CASE_SECTION_IDS]);
    }
  });

  it.each(slugs)('%s has the same structure in Spanish and English', (slug) => {
    // Sections, subsections, gallery variants, figure images and appears, messages per chat,
    // notes per row, demo names and h3 count.
    expect(outlineShape(caseOutline(read('en', slug)))).toEqual(
      outlineShape(caseOutline(read('es', slug))),
    );
  });

  it.each(slugs)('%s describes every figure and uses only existing images', (slug) => {
    for (const locale of ['es', 'en']) {
      for (const section of caseOutline(read(locale, slug)).sections) {
        for (const figure of section.figures) {
          expect(figure.alt.trim(), `${locale}/${slug} #${section.id}`).not.toBe('');
          if (figure.src) {
            expect(figure.src.startsWith('@/assets/works/')).toBe(true);
            expect(existsSync(join(process.cwd(), figure.src.replace('@/', 'src/')))).toBe(true);
          }
          if (figure.appear) expect(Object.keys(CASE_FIGURE_APPEAR)).toContain(figure.appear);
        }
      }
    }
  });

  it.each(slugs)('%s writes no h1–h3 inside a subsection (its kicker is the h3)', (slug) => {
    for (const locale of ['es', 'en']) {
      expect(headingsInSubsections(read(locale, slug)), `${locale}/${slug}`).toEqual([]);
    }
  });

  it.each(slugs)('%s names each demo once and lists it in the frontmatter', (slug) => {
    for (const locale of ['es', 'en']) {
      const outline = caseOutline(read(locale, slug));
      const demos = outline.sections.flatMap((section) => section.demos);
      expect(demos.every(Boolean), `${locale}/${slug}`).toBe(true);
      expect(new Set(demos).size, `${locale}/${slug}`).toBe(demos.length);
      expect([...demos].sort(), `${locale}/${slug}`).toEqual([...outline.frontmatterDemos].sort());
    }
  });

  it.each(slugs)('%s keeps side notes rows of 2 or 3 with known arts', (slug) => {
    for (const locale of ['es', 'en']) {
      const source = read(locale, slug);
      for (const section of caseOutline(source).sections) {
        for (const count of section.notes) expect([2, 3]).toContain(count);
      }
      for (const row of source.matchAll(/<SideNotes\b([^>]*)>([\s\S]*?)<\/SideNotes>/g)) {
        const cols = Number(/cols=\{(\d)\}/.exec(row[1]!)?.[1] ?? 3);
        expect([...row[2]!.matchAll(/<SideNote(?=\s)/g)].length, `${locale}/${slug}`).toBe(cols);
      }
      for (const match of source.matchAll(/<SideNote\s[^>]*\bart="([\w-]+)"/g)) {
        expect(SIDE_NOTE_ARTS).toContain(match[1]);
      }
    }
  });
});
