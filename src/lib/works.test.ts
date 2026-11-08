import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CASE_BLOCK_APPEAR,
  CASE_FIGURE_APPEAR,
  CASE_SECTION_APPEAR,
  caseSectionDelay,
} from '@/components/motion/presets';
import {
  CASE_SECTION_IDS,
  META_DESCRIPTION_MAX,
  caseNeighbours,
  counterpart,
  metaDescription,
  parseWorkId,
  prevNext,
  splitLeadingProse,
  workHref,
  worksForLocale,
  workSlug,
  workStaticPaths,
  type WorkLike,
} from './works';

const entry = (id: string, order: number, draft = false): WorkLike => ({
  id,
  data: { order, draft },
});

const ENTRIES = [
  entry('en/b', 2),
  entry('es/c', 3),
  entry('es/a', 1),
  entry('en/a', 1),
  entry('es/b', 2),
  entry('es/d', 4, true),
  entry('en/c', 3),
];

describe('parseWorkId', () => {
  it('splits locale and slug', () => {
    expect(parseWorkId('es/reto-md')).toEqual({ locale: 'es', slug: 'reto-md' });
    expect(parseWorkId('en/365-dias-de-ajedrez')).toEqual({
      locale: 'en',
      slug: '365-dias-de-ajedrez',
    });
  });

  it('rejects ids without a known locale or with extra segments', () => {
    expect(() => parseWorkId('fr/reto-md')).toThrow();
    expect(() => parseWorkId('reto-md')).toThrow();
    expect(() => parseWorkId('es/a/b')).toThrow();
  });
});

describe('worksForLocale', () => {
  it('keeps one language, sorted by order, without drafts', () => {
    expect(worksForLocale(ENTRIES, 'es').map((work) => work.id)).toEqual(['es/a', 'es/b', 'es/c']);
    expect(worksForLocale(ENTRIES, 'en').map((work) => work.id)).toEqual(['en/a', 'en/b', 'en/c']);
  });

  it('includes drafts on request', () => {
    expect(worksForLocale(ENTRIES, 'es', { includeDrafts: true }).map(workSlug)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
  });
});

describe('prevNext', () => {
  const ordered = worksForLocale(ENTRIES, 'es');

  it('does not wrap around', () => {
    expect(prevNext(ordered, 'a')).toEqual({ previous: null, next: ordered[1] });
    expect(prevNext(ordered, 'b')).toEqual({ previous: ordered[0], next: ordered[2] });
    expect(prevNext(ordered, 'c')).toEqual({ previous: ordered[1], next: null });
  });

  it('returns nothing for an unknown slug', () => {
    expect(prevNext(ordered, 'zzz')).toEqual({ previous: null, next: null });
  });
});

describe('counterpart and workHref', () => {
  it('finds the twin in the other language', () => {
    expect(counterpart(ENTRIES, ENTRIES[2]!, 'en')?.id).toBe('en/a');
    expect(counterpart(ENTRIES, ENTRIES[5]!, 'en')).toBeUndefined();
  });

  it('builds language-prefixed links', () => {
    expect(workHref('reto-md', 'es')).toBe('/works/reto-md');
    expect(workHref('reto-md', 'en')).toBe('/en/works/reto-md');
  });
});

describe('content of src/content/works', () => {
  const root = join(process.cwd(), 'src/content/works');
  const slugs = (locale: string) =>
    readdirSync(join(root, locale))
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => file.replace(/\.mdx$/, ''))
      .sort();
  const orderOf = (locale: string, slug: string) =>
    Number(/^order:\s*(\d+)/m.exec(readFileSync(join(root, locale, `${slug}.mdx`), 'utf8'))?.[1]);

  it('has an English twin for every Spanish case and vice versa', () => {
    expect(slugs('en')).toEqual(slugs('es'));
  });

  it('keeps every meta description within what search results show', () => {
    for (const locale of ['es', 'en']) {
      for (const slug of slugs(locale)) {
        const source = readFileSync(join(root, locale, `${slug}.mdx`), 'utf8');
        const field = (name: string) => new RegExp(`^${name}: '(.*)'$`, 'm').exec(source)?.[1];
        const summary = field('summary') ?? '';
        const description = metaDescription({ summary, description: field('description') });
        expect(description.length, `${locale}/${slug}`).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
      }
    }
  });

  it('gives each case the same order in both languages, without repeats', () => {
    const es = slugs('es').map((slug) => orderOf('es', slug));
    const en = slugs('en').map((slug) => orderOf('en', slug));
    expect(en).toEqual(es);
    expect(new Set(es).size).toBe(es.length);
  });
});

describe('workStaticPaths', () => {
  it('builds one path per published work of the language, in order', () => {
    expect(workStaticPaths(ENTRIES, 'es')).toEqual([
      { params: { slug: 'a' }, props: { entry: ENTRIES[2] } },
      { params: { slug: 'b' }, props: { entry: ENTRIES[4] } },
      { params: { slug: 'c' }, props: { entry: ENTRIES[1] } },
    ]);
  });
});

describe('caseNeighbours', () => {
  const titled = worksForLocale(ENTRIES, 'en').map((work) => ({
    ...work,
    data: { ...work.data, title: work.id.toUpperCase() },
  }));

  it('links the neighbours in the page language, without wrapping', () => {
    expect(caseNeighbours(titled, 'a', 'en')).toEqual({
      previous: null,
      next: { title: 'EN/B', href: '/en/works/b' },
    });
    expect(caseNeighbours(titled, 'c', 'en')).toEqual({
      previous: { title: 'EN/B', href: '/en/works/b' },
      next: null,
    });
  });
});

describe('splitLeadingProse', () => {
  it('splits at the first block and keeps the rest whole', () => {
    const html =
      '<p>One</p><h3>Two</h3><div class="x" data-case-block data-gallery="lead"><figure></figure></div><p>Three</p>';
    expect(splitLeadingProse(html)).toEqual({
      prose: '<p>One</p><h3>Two</h3>',
      rest: '<div class="x" data-case-block data-gallery="lead"><figure></figure></div><p>Three</p>',
    });
  });

  it('returns only prose when there is no block, and no prose when a block comes first', () => {
    expect(splitLeadingProse(' <p>Only</p> ')).toEqual({ prose: '<p>Only</p>', rest: '' });
    expect(splitLeadingProse('<section data-case-block="">x</section>')).toEqual({
      prose: '',
      rest: '<section data-case-block="">x</section>',
    });
  });

  it('ignores the marker in text and in longer attribute names', () => {
    const html = '<p>data-case-block</p><p data-case-blocky>x</p>';
    expect(splitLeadingProse(html)).toEqual({ prose: html, rest: '' });
  });
});

describe('case appear delays (CA-01)', () => {
  /** Block index of kicker, h2 and body in the master template of the reference. */
  const MASTER_INDEX = {
    overview: 0,
    challenge: 3,
    approach: 6,
    research: 10,
    design: 19,
    outcome: 31,
  };

  it('covers every fixed section with the absolute delays of the reference', () => {
    expect(Object.keys(CASE_SECTION_APPEAR)).toEqual([...CASE_SECTION_IDS]);
    for (const id of CASE_SECTION_IDS) {
      const { kicker, heading, body } = CASE_SECTION_APPEAR[id];
      const index = MASTER_INDEX[id];
      expect([kicker.delay, heading.delay, body.delay]).toEqual([
        caseSectionDelay(index),
        caseSectionDelay(index + 1),
        caseSectionDelay(index + 2),
      ]);
    }
  });

  it('places the optional blocks in the gaps of the master template', () => {
    expect(CASE_BLOCK_APPEAR.subsectionKicker.delay).toBe(caseSectionDelay(16));
    expect(CASE_BLOCK_APPEAR.subsectionBody.delay).toBe(caseSectionDelay(17));
    expect(CASE_FIGURE_APPEAR.approachGallery.delay).toBe(caseSectionDelay(18));
    expect(CASE_FIGURE_APPEAR.researchFirst.delay).toBe(caseSectionDelay(15));
    expect(CASE_FIGURE_APPEAR.designLead.delay).toBe(caseSectionDelay(24));
    expect(CASE_FIGURE_APPEAR.designRowFirst.delay).toBe(caseSectionDelay(27));
    expect(CASE_FIGURE_APPEAR.designRowSecond.delay).toBe(caseSectionDelay(30));
  });
});
