/**
 * The single static 404 (fase7-plan §3, 404-spec §8): which language a missing URL belongs to, and
 * the ten lines its terminal types.
 */
import type { Locale } from '@/i18n/locales';
import type { NotFoundLine } from '@/i18n/messages/es/not-found';
import { splitLocale } from '@/lib/i18n-paths';
import type { TyperLine } from '@/lib/typer';

/** Widest line, prefix included, that fits the 350 px of a phone without wrapping (404-spec §4). */
export const TERMINAL_MAX_CHARS = 32;

/** Language of a missing URL: English under `/en`, Spanish anywhere else (same rule as `splitLocale`). */
export function notFoundLocale(pathname: string): Locale {
  return splitLocale(pathname).locale;
}

/** The copy of one language, as the terminal reads it. */
export interface NotFoundTerminalCopy {
  readonly lines: readonly NotFoundLine[];
  readonly back: TyperLine;
}

/** The ten typed lines: the nine of the terminal plus the link home. */
export function terminalLines(copy: NotFoundTerminalCopy): TyperLine[] {
  return [...copy.lines, copy.back];
}

/** Characters a line takes on screen (prefix and text, as code points). */
export function terminalLineLength(line: TyperLine): number {
  return Array.from(`${line.prefix ?? ''}${line.text}`).length;
}
