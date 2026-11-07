import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  counterpart,
  parseWorkId,
  prevNext,
  workHref,
  worksForLocale,
  workSlug,
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

  it('gives each case the same order in both languages, without repeats', () => {
    const es = slugs('es').map((slug) => orderOf('es', slug));
    const en = slugs('en').map((slug) => orderOf('en', slug));
    expect(en).toEqual(es);
    expect(new Set(es).size).toBe(es.length);
  });
});
