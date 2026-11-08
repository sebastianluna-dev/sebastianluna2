// Markdown-lite for Blue's answers: paragraphs, line breaks, bulleted and numbered lists, bold,
// italics, inline code and links. It returns a tree that the panel renders as React elements, so
// no HTML from the model ever reaches the DOM; anything else (raw HTML, images, headings, tables)
// stays plain text, except that a heading line becomes a bold paragraph.

export type LinkKind = 'internal' | 'external' | 'mailto';

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: InlineNode[] }
  | { type: 'em'; children: InlineNode[] }
  | { type: 'code'; text: string }
  | { type: 'break' }
  | { type: 'link'; kind: LinkKind; href: string; children: InlineNode[] };

export type BlockNode =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'list'; ordered: boolean; start: number; items: InlineNode[][] };

export interface MarkdownOptions {
  /** Origins whose absolute URLs count as internal (the site and the current page). */
  siteOrigins?: readonly string[];
}

export interface SafeLink {
  kind: LinkKind;
  /**
   * Internal: path + search + hash. External: the absolute URL, or the site path of a file (a PDF
   * opens in a new tab, never through the router). Mailto: `mailto:` URL.
   */
  href: string;
}

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// eslint-disable-next-line no-control-regex -- the point is to find control characters
const CONTROL = /[\u0000-\u001f\u007f]/;
/** Any origin works: relative paths are resolved against it only to normalise them. */
const RESOLVE_BASE = 'https://site.invalid';
/** A path to a file (`/cv/…/cv.pdf`): the router can only navigate to pages. */
const FILE_PATH = /\.[a-z0-9]{2,5}$/i;

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** A site-relative path, normalised; `null` when it would leave the site (`/\evil.com`). */
function sitePath(href: string): SafeLink | null {
  // Browsers read `\` as `/` in http URLs, so `/\host` would be protocol-relative.
  if (href.startsWith('//') || href.includes('\\')) return null;
  let url: URL;
  try {
    url = new URL(href, RESOLVE_BASE);
  } catch {
    return null;
  }
  if (url.origin !== RESOLVE_BASE) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return { kind: FILE_PATH.test(url.pathname) ? 'external' : 'internal', href: path };
}

/** Decides whether and how a link may be rendered; `null` keeps only its text. Never throws. */
export function classifyHref(raw: string, options: MarkdownOptions = {}): SafeLink | null {
  const href = raw.trim();
  if (!href || CONTROL.test(href)) return null;
  if (href.startsWith('#')) return { kind: 'internal', href };
  if (href.startsWith('/')) return sitePath(href);
  if (/^mailto:/i.test(href)) {
    const address = href.slice('mailto:'.length).split('?')[0] ?? '';
    const decoded = safeDecode(address);
    return decoded !== null && EMAIL.test(decoded)
      ? { kind: 'mailto', href: `mailto:${address}` }
      : null;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (options.siteOrigins?.includes(url.origin) && !FILE_PATH.test(url.pathname)) {
    return { kind: 'internal', href: `${url.pathname}${url.search}${url.hash}` };
  }
  return { kind: 'external', href: url.href };
}

// ------------------------------------------------------------------ inline

type Rule = {
  re: RegExp;
  build: (m: RegExpExecArray, options: MarkdownOptions, depth: number) => InlineNode[];
  /** Makes a link: skipped inside a link's own text. */
  link?: boolean;
  /** The rule only starts a word: it is skipped when the previous character matches this. */
  wordStart?: RegExp;
};

const AFTER_WORD = /[\p{L}\p{N}]/u;
const AFTER_WORD_OR_URL = /[\p{L}\p{N}.@/]/u;

const MAX_DEPTH = 4;
const TRAILING_PUNCTUATION = /[.,;:!?)\]'"»”’]+$/;

const RULES: Rule[] = [
  { re: /`([^`\n]+)`/y, build: (m) => [{ type: 'code', text: m[1]! }] },
  {
    link: true,
    re: /\[([^\]\n]+)\]\(\s*<?([^)\s>]+)>?\s*\)/y,
    build: (m, options, depth) => {
      const children = parseInline(m[1]!, options, depth + 1, false);
      const link = classifyHref(m[2]!, options);
      return link ? [{ type: 'link', ...link, children }] : children;
    },
  },
  {
    re: /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1/y,
    build: (m, options, depth) => [
      { type: 'strong', children: parseInline(m[2]!, options, depth + 1) },
    ],
  },
  {
    re: /\*(?=[^\s*])([\s\S]+?)(?<=[^\s*])\*(?!\*)/y,
    build: (m, options, depth) => [
      { type: 'em', children: parseInline(m[1]!, options, depth + 1) },
    ],
  },
  {
    // `_` only around whole words, so snake_case stays text.
    wordStart: AFTER_WORD,
    re: /_(?=[^\s_])([^_\n]+?)(?<=[^\s_])_(?![\p{L}\p{N}])/uy,
    build: (m, options, depth) => [
      { type: 'em', children: parseInline(m[1]!, options, depth + 1) },
    ],
  },
  {
    link: true,
    wordStart: AFTER_WORD_OR_URL,
    re: /https?:\/\/[^\s<>()[\]]+/y,
    build: (m, options) => {
      const url = m[0].replace(TRAILING_PUNCTUATION, '');
      const link = classifyHref(url, options);
      const rest = m[0].slice(url.length);
      const nodes: InlineNode[] = link
        ? [{ type: 'link', ...link, children: [{ type: 'text', text: url }] }]
        : [{ type: 'text', text: url }];
      if (rest) nodes.push({ type: 'text', text: rest });
      return nodes;
    },
  },
  {
    link: true,
    wordStart: AFTER_WORD_OR_URL,
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/y,
    build: (m) => [
      {
        type: 'link',
        kind: 'mailto',
        href: `mailto:${m[0]}`,
        children: [{ type: 'text', text: m[0] }],
      },
    ],
  },
];

/** Characters where a rule may start; any other character is copied as text. */
const TRIGGER = /[`[*_hA-Za-z0-9\n]/;

function pushText(nodes: InlineNode[], text: string): void {
  const last = nodes.at(-1);
  if (last?.type === 'text') last.text += text;
  else nodes.push({ type: 'text', text });
}

/** Inline content of one block; `\n` becomes a line break. */
export function parseInline(
  source: string,
  options: MarkdownOptions = {},
  depth = 0,
  links = true,
): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '\n') {
      nodes.push({ type: 'break' });
      i++;
      continue;
    }
    let matched = false;
    if (depth < MAX_DEPTH && TRIGGER.test(ch)) {
      const prev = i > 0 ? source[i - 1]! : '';
      for (const rule of RULES) {
        if (rule.link && !links) continue;
        if (rule.wordStart?.test(prev)) continue;
        rule.re.lastIndex = i;
        const m = rule.re.exec(source);
        if (!m) continue;
        for (const node of rule.build(m, options, depth)) {
          if (node.type === 'text') pushText(nodes, node.text);
          else nodes.push(node);
        }
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      pushText(nodes, ch);
      i++;
    }
  }
  return nodes;
}

// ------------------------------------------------------------------ blocks

const LIST_ITEM = /^\s{0,3}(?:([-*+•])|(\d{1,3})[.)])\s+(.*)$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;

/** Parses a whole answer into blocks. */
export function parseMarkdownLite(source: string, options: MarkdownOptions = {}): BlockNode[] {
  const blocks: BlockNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; start: number; items: string[] } | null = null;

  const closeParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n'), options) });
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      blocks.push({
        type: 'list',
        ordered: list.ordered,
        start: list.start,
        items: list.items.map((item) => parseInline(item, options)),
      });
      list = null;
    }
  };

  for (const rawLine of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim() === '') {
      closeParagraph();
      closeList();
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      const ordered = item[2] !== undefined;
      closeParagraph();
      if (list && list.ordered !== ordered) closeList();
      list ??= { ordered, start: ordered ? Number(item[2]) : 1, items: [] };
      list.items.push(item[3]!);
      continue;
    }
    // An indented line right after an item continues it.
    if (list && /^\s{2,}\S/.test(rawLine)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    closeList();
    const heading = HEADING.exec(line);
    if (heading) {
      closeParagraph();
      blocks.push({
        type: 'paragraph',
        children: [{ type: 'strong', children: parseInline(heading[1]!, options) }],
      });
      continue;
    }
    paragraph.push(line.trim());
  }
  closeParagraph();
  closeList();
  return blocks;
}

/** Plain text of a tree, for the live region and the copy that screen readers get. */
export function markdownToText(blocks: BlockNode[]): string {
  const inline = (nodes: InlineNode[]): string =>
    nodes
      .map((node) => {
        switch (node.type) {
          case 'text':
          case 'code':
            return node.text;
          case 'break':
            return '\n';
          default:
            return inline(node.children);
        }
      })
      .join('');
  return blocks
    .map((block) =>
      block.type === 'paragraph'
        ? inline(block.children)
        : block.items.map((item) => `• ${inline(item)}`).join('\n'),
    )
    .join('\n\n');
}
