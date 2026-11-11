import { describe, expect, it } from 'vitest';
import { NOT_FOUND_TYPER } from '@/components/motion/presets';
import { LOCALES } from '@/i18n/locales';
import { getMessages } from '@/i18n/t';
import { TERMINAL_MAX_CHARS, notFoundLocale, terminalLineLength, terminalLines } from './not-found';

describe('notFoundLocale', () => {
  it('reads Spanish under /es', () => {
    for (const path of ['/es', '/es/', '/es/x', '/es/works/nope', '/es/x/y/']) {
      expect(notFoundLocale(path)).toBe('es');
    }
  });

  it('reads English anywhere else', () => {
    for (const path of ['/', '/x', '/espanol', '/esx/y', '/works/es', '/404', '/ES/x']) {
      expect(notFoundLocale(path)).toBe('en');
    }
  });
});

describe('404 terminal copy (fase7-plan §3.2)', () => {
  for (const locale of LOCALES) {
    const copy = getMessages(locale).notFound;
    const lines = terminalLines(copy);

    it(`${locale}: has one timing entry per line, the link included`, () => {
      expect(copy.lines.length + 1).toBe(NOT_FOUND_TYPER.lines.length);
      expect(lines).toHaveLength(NOT_FOUND_TYPER.lines.length);
      expect(lines.at(-1)).toBe(copy.back);
    });

    it(`${locale}: fits a phone without wrapping`, () => {
      for (const line of lines)
        expect(terminalLineLength(line)).toBeLessThanOrEqual(TERMINAL_MAX_CHARS);
    });

    it(`${locale}: has exactly one heading`, () => {
      expect(copy.lines.filter((line) => line.heading)).toHaveLength(1);
    });

    it(`${locale}: gives a prefix delay to exactly the prefixed lines`, () => {
      lines.forEach((line, index) => {
        expect('prefixDelay' in NOT_FOUND_TYPER.lines[index]).toBe(Boolean(line.prefix));
      });
    });

    it(`${locale}: keeps the symbols out of the typed text`, () => {
      for (const line of lines) expect(line.text).not.toMatch(/[✓✕█>]/);
    });
  }

  it('uses the same prefixes and heading line in both languages', () => {
    const shape = (locale: (typeof LOCALES)[number]) =>
      terminalLines(getMessages(locale).notFound).map((line) => [
        line.prefix ?? '',
        'heading' in line && line.heading === true,
      ]);
    expect(shape('en')).toEqual(shape('es'));
  });
});

describe('terminalLineLength', () => {
  it('counts the prefix and the text as code points', () => {
    expect(terminalLineLength({ prefix: '✓ ', text: 'página' })).toBe(8);
    expect(terminalLineLength({ text: 'abc' })).toBe(3);
  });
});
