/**
 * Logic of the dev copy editor (`src/dev/CopyEditor.astro`): finds a text as the page shows it inside
 * the MDX source of a case or an article and swaps it for the corrected one. Pure, so it is tested
 * without a browser; the dev endpoint only reads and writes the file.
 */

export type CopyEditResult =
  { ok: true; source: string } | { ok: false; reason: 'missing' | 'ambiguous' | 'unsafe' | 'same' };

const QUOTES: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  ' ': ' ',
};

/**
 * The text as it is compared: typographic quotes straightened (the page curls the ones of the
 * source), every run of white space, line breaks and indentation included, as one space.
 */
export function normalizeCopy(text: string): string {
  return [...text]
    .map((char) => QUOTES[char] ?? char)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The normalized source with, for each of its characters, the index it comes from. */
function normalizedView(source: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  let space = true;
  for (let index = 0; index < source.length; index += 1) {
    const raw = source[index] ?? '';
    const char = QUOTES[raw] ?? raw;
    if (/\s/.test(char)) {
      if (space) continue;
      space = true;
      text += ' ';
    } else {
      space = false;
      text += char;
    }
    map.push(index);
  }
  return { text, map };
}

/** The quote that delimits the string a position sits in, if it is inside one on its own line. */
function delimiterAt(source: string, start: number): string | null {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  let open: string | null = null;
  for (let index = lineStart; index < start; index += 1) {
    const char = source[index];
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char !== "'" && char !== '"' && char !== '`') continue;
    if (open === null) open = char;
    else if (open === char) open = null;
  }
  return open;
}

/**
 * Swaps `before` (the text the page showed) for `after` in the MDX `source`. The text must appear
 * exactly once; a correction that would break the markup around it is refused: a tag or an
 * expression anywhere, or the quote of the string it lives in.
 */
export function replaceCopy(source: string, before: string, after: string): CopyEditResult {
  const wanted = normalizeCopy(before);
  const next = after.replace(/\s+/g, ' ').trim();
  if (wanted === '' || next === '') return { ok: false, reason: 'unsafe' };
  if (wanted === normalizeCopy(next)) return { ok: false, reason: 'same' };

  const view = normalizedView(source);
  const first = view.text.indexOf(wanted);
  if (first === -1) return { ok: false, reason: 'missing' };
  if (view.text.indexOf(wanted, first + 1) !== -1) return { ok: false, reason: 'ambiguous' };

  const start = view.map[first] ?? 0;
  const end = (view.map[first + wanted.length - 1] ?? start) + 1;
  if (/[<>{}]/.test(next)) return { ok: false, reason: 'unsafe' };
  const delimiter = delimiterAt(source, start);
  if (delimiter !== null && (next.includes(delimiter) || next.includes('\\'))) {
    return { ok: false, reason: 'unsafe' };
  }
  return { ok: true, source: source.slice(0, start) + next + source.slice(end) };
}

/**
 * The MDX file behind a page path (`/works/<slug>`, `/es/writings/<slug>`), relative to the project
 * root; `null` for any other page. `defaultLocale` is the one served without a prefix.
 */
export function copySourcePath(pathname: string, defaultLocale: string): string | null {
  const match = /^\/(?:(es|en)\/)?(works|writings)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  if (!match) return null;
  const [, locale = defaultLocale, collection, slug] = match;
  return `src/content/${collection}/${locale}/${slug}.mdx`;
}
