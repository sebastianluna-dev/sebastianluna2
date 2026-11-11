import { describe, expect, it } from 'vitest';
import { classifyHref, markdownToText, parseInline, parseMarkdownLite } from './markdown';

const SITE = { siteOrigins: ['https://www.sebastianluna.dev'] };

describe('classifyHref', () => {
  it('keeps site paths and hashes as internal links', () => {
    expect(classifyHref('/works/reto-md#outcome')).toEqual({
      kind: 'internal',
      href: '/works/reto-md#outcome',
    });
    expect(classifyHref('#works')).toEqual({ kind: 'internal', href: '#works' });
    expect(classifyHref('https://www.sebastianluna.dev/en/works/reto-md?x=1#a', SITE)).toEqual({
      kind: 'internal',
      href: '/en/works/reto-md?x=1#a',
    });
  });

  it('marks other http(s) addresses as external', () => {
    expect(classifyHref('https://github.com/sebastianluna-dev')).toEqual({
      kind: 'external',
      href: 'https://github.com/sebastianluna-dev',
    });
  });

  it('accepts mailto only with a real address', () => {
    expect(classifyHref('mailto:sebastian.luna.developer@gmail.com')?.kind).toBe('mailto');
    expect(classifyHref('mailto:nope')).toBeNull();
  });

  it('refuses scripts, data, protocol-relative and junk', () => {
    for (const href of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'data:text/html,<b>x</b>',
      '//evil.example/path',
      'vbscript:x',
      'ftp://x.example',
      'not a url',
      '/\\evil.example',
      '/\\/evil.example',
      '/works/\u0000x',
    ]) {
      expect(classifyHref(href)).toBeNull();
    }
  });

  it('never throws on malformed escapes (R6-01)', () => {
    expect(() => classifyHref('mailto:%E0%A4%A')).not.toThrow();
    expect(classifyHref('mailto:%zz@x.com')).toBeNull();
    expect(() => parseMarkdownLite('[x](mailto:%E0%A4%A) and [y](#%zz)')).not.toThrow();
    expect(classifyHref('#%zz')).toEqual({ kind: 'internal', href: '#%zz' });
  });

  it('opens files such as the CV in a new tab, never through the router', () => {
    const cv = '/cv/es/cv-sebastian-luna-ai-product-engineer.pdf';
    expect(classifyHref(cv)).toEqual({ kind: 'external', href: cv });
    expect(classifyHref(`https://www.sebastianluna.dev${cv}`, SITE)).toEqual({
      kind: 'external',
      href: `https://www.sebastianluna.dev${cv}`,
    });
  });

  it('normalises site paths', () => {
    expect(classifyHref('/works/../en/works/reto-md#outcome')).toEqual({
      kind: 'internal',
      href: '/en/works/reto-md#outcome',
    });
  });
});

describe('parseInline', () => {
  it('reads bold, italics and code', () => {
    expect(parseInline('a **b** *c* _d_ `e`')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'strong', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'c' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'd' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'e' },
    ]);
  });

  it('nests emphasis and links', () => {
    expect(parseInline('**mira [el caso](/works/reto-md)**')).toEqual([
      {
        type: 'strong',
        children: [
          { type: 'text', text: 'mira ' },
          {
            type: 'link',
            kind: 'internal',
            href: '/works/reto-md',
            children: [{ type: 'text', text: 'el caso' }],
          },
        ],
      },
    ]);
  });

  it('keeps unsafe links as their text only', () => {
    expect(parseInline('[clic](javascript:alert`1`)')).toEqual([{ type: 'text', text: 'clic' }]);
    // Nested parentheses end the address early: still no link, just text.
    expect(parseInline('[clic](javascript:alert(1))').some((n) => n.type === 'link')).toBe(false);
  });

  it('autolinks bare URLs without trailing punctuation, and emails', () => {
    expect(parseInline('Ver https://github.com/x. O sebastian.luna.developer@gmail.com.')).toEqual([
      { type: 'text', text: 'Ver ' },
      {
        type: 'link',
        kind: 'external',
        href: 'https://github.com/x',
        children: [{ type: 'text', text: 'https://github.com/x' }],
      },
      { type: 'text', text: '. O ' },
      {
        type: 'link',
        kind: 'mailto',
        href: 'mailto:sebastian.luna.developer@gmail.com',
        children: [{ type: 'text', text: 'sebastian.luna.developer@gmail.com' }],
      },
      { type: 'text', text: '.' },
    ]);
  });

  it('leaves raw HTML, snake_case and lone markers as text', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { type: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
    expect(parseInline('use snake_case_names here')).toEqual([
      { type: 'text', text: 'use snake_case_names here' },
    ]);
    expect(parseInline('5 * 3 = 15 and **open')).toEqual([
      { type: 'text', text: '5 * 3 = 15 and **open' },
    ]);
  });

  it('turns newlines into breaks', () => {
    expect(parseInline('a\nb')).toEqual([
      { type: 'text', text: 'a' },
      { type: 'break' },
      { type: 'text', text: 'b' },
    ]);
  });
});

describe('parseMarkdownLite', () => {
  it('splits paragraphs and lists', () => {
    const blocks = parseMarkdownLite('Hola.\n\n- uno\n- **dos**\n  sigue\n\n1. a\n2. b\nFin');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'list', 'paragraph']);
    const [, bullets, numbers] = blocks;
    expect(bullets).toMatchObject({
      ordered: false,
      items: [[{ text: 'uno' }], expect.any(Array)],
    });
    expect(markdownToText([bullets!])).toBe('• uno\n• dos sigue');
    expect(numbers).toMatchObject({ ordered: true, start: 1 });
  });

  it('keeps the start of a numbered list', () => {
    expect(parseMarkdownLite('3. c\n4. d')[0]).toMatchObject({ ordered: true, start: 3 });
  });

  it('turns headings into bold paragraphs', () => {
    expect(parseMarkdownLite('## Proyectos')).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'strong', children: [{ type: 'text', text: 'Proyectos' }] }],
      },
    ]);
  });

  it('gives plain text back', () => {
    expect(markdownToText(parseMarkdownLite('**Hola**, ve [aquí](/x).\n\n- a'))).toBe(
      'Hola, ve aquí.\n\n• a',
    );
  });
});
