import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { META_DESCRIPTION_MAX } from './works';
import {
  READING_WORDS_PER_MINUTE,
  bodyText,
  codeGutterCh,
  codeLanguageLabel,
  countCodeLines,
  countWords,
  formatWritingDate,
  isExternalHref,
  parseWritingId,
  pickEmoji,
  readingMinutes,
  writingDateTime,
  writingCounterpart,
  writingHref,
  writingLocale,
  writingSlug,
  writingStaticPaths,
  writingsForLocale,
  writingsIndexHref,
  type WritingLike,
} from './writings';

const entry = (
  id: string,
  date: string,
  { order, draft = false }: { order?: number; draft?: boolean } = {},
): WritingLike => ({ id, data: { date: new Date(date), order, draft } });

const entries = [
  entry('es/viejo', '2026-01-10'),
  entry('es/nuevo', '2026-10-01'),
  entry('es/fijado-2', '2025-05-01', { order: 2 }),
  entry('es/fijado-1', '2024-05-01', { order: 1 }),
  entry('es/borrador', '2026-11-08', { draft: true }),
  entry('es/mismo-dia-b', '2026-03-03'),
  entry('es/mismo-dia-a', '2026-03-03'),
  entry('en/nuevo', '2026-10-01'),
  entry('en/borrador', '2026-11-08', { draft: true }),
];

const ids = (list: readonly WritingLike[]) => list.map((item) => item.id);

describe('parseWritingId', () => {
  it('reads the locale and the slug from the id', () => {
    expect(parseWritingId('es/articulo-de-ejemplo')).toEqual({
      locale: 'es',
      slug: 'articulo-de-ejemplo',
    });
    expect(writingSlug(entry('en/x', '2026-01-01'))).toBe('x');
    expect(writingLocale(entry('en/x', '2026-01-01'))).toBe('en');
  });

  it('rejects ids without a known locale or with extra segments', () => {
    expect(() => parseWritingId('fr/x')).toThrow('Writing id must be <locale>/<slug>');
    expect(() => parseWritingId('es')).toThrow();
    expect(() => parseWritingId('es/a/b')).toThrow();
  });
});

describe('writingsForLocale', () => {
  it('filters the language, leaves drafts out and orders: order first, then newest, then id', () => {
    expect(ids(writingsForLocale(entries, 'es'))).toEqual([
      'es/fijado-1',
      'es/fijado-2',
      'es/nuevo',
      'es/mismo-dia-a',
      'es/mismo-dia-b',
      'es/viejo',
    ]);
    expect(ids(writingsForLocale(entries, 'en'))).toEqual(['en/nuevo']);
  });

  it('keeps drafts only when asked (astro dev)', () => {
    expect(ids(writingsForLocale(entries, 'es', { includeDrafts: true }))).toContain('es/borrador');
    expect(ids(writingsForLocale(entries, 'en', { includeDrafts: true }))).toEqual([
      'en/borrador',
      'en/nuevo',
    ]);
  });

  it('is empty for a language without published writings', () => {
    expect(writingsForLocale([entry('en/borrador', '2026-11-08', { draft: true })], 'en')).toEqual(
      [],
    );
  });
});

describe('routes', () => {
  it('builds localised links', () => {
    expect(writingsIndexHref('es')).toBe('/writings');
    expect(writingsIndexHref('en')).toBe('/en/writings');
    expect(writingHref('x', 'es')).toBe('/writings/x');
    expect(writingHref('x', 'en')).toBe('/en/writings/x');
  });

  it('generates no page for a draft unless asked', () => {
    const slugs = (options?: { includeDrafts?: boolean }) =>
      writingStaticPaths(entries, 'en', options).map((path) => path.params.slug);
    expect(slugs()).toEqual(['nuevo']);
    expect(slugs({ includeDrafts: true })).toEqual(['borrador', 'nuevo']);
    expect(writingStaticPaths(entries, 'es')[0]?.props.entry.id).toBe('es/fijado-1');
  });

  it('finds the twin in the other language', () => {
    const es = entries.find((item) => item.id === 'es/nuevo')!;
    expect(writingCounterpart(entries, es, 'en')?.id).toBe('en/nuevo');
    expect(writingCounterpart(entries, entries[0]!, 'en')).toBeUndefined();
  });
});

describe('reading time', () => {
  it('counts words with letters or digits only', () => {
    expect(countWords('  Hola, mundo — 2026 · fin  ')).toBe(4);
    expect(countWords('')).toBe(0);
  });

  it('reads 200 words per minute, rounded, never below 1', () => {
    const words = (n: number) => Array.from({ length: n }, () => 'palabra').join(' ');
    expect(READING_WORDS_PER_MINUTE).toBe(200);
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes(words(50))).toBe(1);
    expect(readingMinutes(words(881))).toBe(4);
    expect(readingMinutes(words(4339))).toBe(22);
  });

  it('lets the frontmatter override the computed minutes', () => {
    expect(readingMinutes('uno dos tres', 7)).toBe(7);
  });
});

describe('formatWritingDate', () => {
  const day = new Date('2026-11-08');

  it('writes the long date of each language', () => {
    expect(formatWritingDate(day, 'es')).toBe('8 de noviembre de 2026');
    expect(formatWritingDate(day, 'en')).toBe('November 8, 2026');
  });

  it('keeps the calendar day of the frontmatter (UTC) and gives it to <time>', () => {
    expect(formatWritingDate(new Date('2026-01-01'), 'en')).toBe('January 1, 2026');
    expect(writingDateTime(day)).toBe('2026-11-08');
  });
});

describe('bodyText', () => {
  it('drops imports, fenced code, JSX tags with their props and Markdown punctuation', () => {
    const mdx = [
      "import { ChatAside } from '@/components/portfolio/writing';",
      '',
      'Primer **párrafo** con [un enlace](https://example.com) y `código`.',
      '',
      '## Encabezado',
      '',
      '- uno',
      '1. dos',
      '',
      '![alt](imagen.png)',
      '',
      '| A | B |',
      '| --- | --- |',
      '| c | d |',
      '',
      '```ts',
      'const hidden = 1;',
      '```',
      '',
      '<ChatAside',
      "  messages={[{ from: 'visitor', text: 'no cuenta > nada' }]}",
      '/>',
      '',
      '<SideNote title="Título" art="blocks">',
      '  Sí cuenta.',
      '</SideNote>',
      '{/* comentario */}',
    ].join('\n');
    expect(bodyText(mdx)).toBe(
      'Primer párrafo con un enlace y código. Encabezado uno dos A B c d Sí cuenta.',
    );
  });

  it('reads the example draft in one or two minutes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/content/writings/es/articulo-de-ejemplo.mdx'),
      'utf8',
    );
    expect(readingMinutes(bodyText(source.replace(/^---[\s\S]*?---/u, '')))).toBeLessThanOrEqual(2);
  });
});

describe('article body helpers', () => {
  it('tells external links from the site and relative ones', () => {
    const site = 'https://www.sebastianluna.dev';
    expect(isExternalHref('https://github.com/sebastianluna-dev', site)).toBe(true);
    expect(isExternalHref('https://www.sebastianluna.dev/en', site)).toBe(false);
    expect(isExternalHref('/#works', site)).toBe(false);
    expect(isExternalHref('mailto:hola@example.com', site)).toBe(false);
  });

  it('names the language of a code block', () => {
    expect(codeLanguageLabel('ts')).toBe('TypeScript');
    expect(codeLanguageLabel('html')).toBe('HTML');
    expect(codeLanguageLabel(undefined)).toBe('Text');
    expect(codeLanguageLabel('  CSS ')).toBe('CSS');
  });

  it('sizes the gutter to the digits of the last line plus one', () => {
    expect(codeGutterCh(2)).toBe(2);
    expect(codeGutterCh(19)).toBe(3);
    expect(codeGutterCh(120)).toBe(4);
    expect(codeGutterCh(0)).toBe(2);
  });

  it('counts the lines of the Shiki output', () => {
    expect(
      countCodeLines('<code><span class="line">a</span>\n<span class="line"></span></code>'),
    ).toBe(2);
  });

  it('picks the first emoji at 0 and stays inside the set', () => {
    const set = ['♟️', '🎻', '🩺'];
    expect(pickEmoji(set, () => 0)).toBe('♟️');
    expect(pickEmoji(set, () => 0.999999)).toBe('🩺');
    expect(pickEmoji(set, () => 1)).toBe('🩺');
    expect(pickEmoji([], () => 0.5)).toBe('');
  });
});

describe('content of src/content/writings', () => {
  const root = join(process.cwd(), 'src/content/writings');
  const slugs = (locale: string) =>
    readdirSync(join(root, locale))
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => file.replace(/\.mdx$/u, ''))
      .sort();
  const read = (locale: string, slug: string) =>
    readFileSync(join(root, locale, `${slug}.mdx`), 'utf8');
  const split = (source: string) => {
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/u.exec(source);
    return { front: match?.[1] ?? '', body: match?.[2] ?? '' };
  };
  const field = (front: string, name: string) =>
    new RegExp(`^${name}: (['"])(.*)\\1$`, 'mu').exec(front)?.[2];
  const all = () =>
    ['es', 'en'].flatMap((locale) => slugs(locale).map((slug) => ({ locale, slug })));

  it('has an English twin for every Spanish writing and vice versa', () => {
    expect(slugs('en')).toEqual(slugs('es'));
  });

  it('publishes both languages of a writing together (same `draft`)', () => {
    const draft = (locale: string, slug: string) =>
      /^draft: true$/mu.test(split(read(locale, slug)).front);
    for (const slug of slugs('es')) {
      expect(draft('en', slug), slug).toBe(draft('es', slug));
    }
  });

  it('keeps every description within what search results show', () => {
    for (const { locale, slug } of all()) {
      const description = field(split(read(locale, slug)).front, 'description') ?? '';
      expect(description.length, `${locale}/${slug}`).toBeGreaterThan(0);
      expect(description.length, `${locale}/${slug}`).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    }
  });

  it('starts the body at ## (the h1 is the title)', () => {
    for (const { locale, slug } of all()) {
      const body = split(read(locale, slug)).body.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1\s*$/gmu, '');
      expect(body, `${locale}/${slug}`).not.toMatch(/^# /mu);
      expect(/^(#{2,6}) /mu.exec(body)?.[1] ?? '##', `${locale}/${slug}`).toBe('##');
    }
  });

  it('gives both languages the same components', () => {
    const shape = (body: string) => ({
      figures: (body.match(/<WritingFigure\b/gu) ?? []).length,
      chats: (body.match(/<ChatAside\b/gu) ?? []).length,
      notes: (body.match(/<SideNote\b/gu) ?? []).length,
      tables: (body.match(/^\|\s*:?-{3,}/gmu) ?? []).length,
      code: (body.match(/^```\S/gmu) ?? []).length,
      headings: (body.match(/^#{2,3} /gmu) ?? []).length,
    });
    for (const slug of slugs('es')) {
      expect(shape(split(read('en', slug)).body), slug).toEqual(
        shape(split(read('es', slug)).body),
      );
    }
  });

  it('marks every example draft as a draft', () => {
    for (const { locale, slug } of all()) {
      const { front } = split(read(locale, slug));
      const title = field(front, 'title') ?? '';
      if (title.startsWith('[Borrador') || title.startsWith('[Example draft')) {
        expect(front, `${locale}/${slug}`).toMatch(/^draft: true$/mu);
      }
    }
  });
});
