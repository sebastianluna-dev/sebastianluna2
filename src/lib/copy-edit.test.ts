import { describe, expect, it } from 'vitest';
import { copySourcePath, normalizeCopy, replaceCopy } from './copy-edit';

const SOURCE = `---
title: 'Cuarteto Fratres'
---

<CaseSection id="overview" title="El cuarteto y el encargo">

En el escenario ya eran conocidos. En internet no existían.

The disc carries the quartet's photograph as its label.

<DemoFrame
  name="brand"
  caption="El monograma CF, punto por punto."
>
</DemoFrame>

<ChatAside
  messages={[
    { from: 'visitor', text: '¿Y Claude Code qué hace?' },
    {
      from: 'sebastian',
      text: "Real! Borodin's second quartet, note by note.",
    },
  ]}
/>

<SideNote title="Diseñar" art="palette">
  Definí cada pieza hasta sus posiciones,
  espacios y tipografía.
</SideNote>

Violín. Violín.
`;

function replaced(before: string, after: string): string {
  const result = replaceCopy(SOURCE, before, after);
  if (!result.ok) throw new Error(result.reason);
  return result.source;
}

describe('normalizeCopy', () => {
  it('straightens curled quotes and collapses white space', () => {
    expect(normalizeCopy('  the quartet’s\n   “label” ')).toBe('the quartet\'s "label"');
  });
});

describe('replaceCopy', () => {
  it('swaps a paragraph', () => {
    const out = replaced(
      'En el escenario ya eran conocidos. En internet no existían.',
      'Ya eran conocidos.',
    );
    expect(out).toContain('\nYa eran conocidos.\n');
    expect(out).not.toContain('En internet no existían');
  });

  it('finds a text the page shows with curled quotes', () => {
    const out = replaced(
      'The disc carries the quartet’s photograph as its label.',
      'The disc carries their photograph.',
    );
    expect(out).toContain('\nThe disc carries their photograph.\n');
  });

  it('swaps a text that spans two indented lines of the source', () => {
    const out = replaced(
      'Definí cada pieza hasta sus posiciones, espacios y tipografía.',
      'Definí cada pieza.',
    );
    expect(out).toContain(
      '<SideNote title="Diseñar" art="palette">\n  Definí cada pieza.\n</SideNote>',
    );
  });

  it('swaps a text inside a prop and keeps its quotes', () => {
    expect(
      replaced('El monograma CF, punto por punto.', 'El monograma, punto por punto.'),
    ).toContain('caption="El monograma, punto por punto."');
    expect(replaced('¿Y Claude Code qué hace?', '¿Qué hace Claude Code?')).toContain(
      "text: '¿Qué hace Claude Code?' }",
    );
  });

  it('refuses the quote that would close the string it lives in', () => {
    expect(replaceCopy(SOURCE, '¿Y Claude Code qué hace?', "¿Qué hace 'Claude'?")).toEqual({
      ok: false,
      reason: 'unsafe',
    });
    expect(replaceCopy(SOURCE, 'El monograma CF, punto por punto.', 'El "monograma".')).toEqual({
      ok: false,
      reason: 'unsafe',
    });
  });

  it('lets through the other quote, and any quote in a paragraph', () => {
    expect(
      replaced('Real! Borodin’s second quartet, note by note.', "Real! Borodin's quartet."),
    ).toContain('text: "Real! Borodin\'s quartet.",');
    expect(
      replaced('En el escenario ya eran conocidos. En internet no existían.', 'Eran "conocidos".'),
    ).toContain('\nEran "conocidos".\n');
  });

  it('refuses markup and expressions', () => {
    for (const after of ['Un <b>cuarteto</b>.', 'Un {cuarteto}.']) {
      expect(
        replaceCopy(SOURCE, 'En el escenario ya eran conocidos. En internet no existían.', after),
      ).toEqual({
        ok: false,
        reason: 'unsafe',
      });
    }
  });

  it('refuses an empty correction', () => {
    expect(replaceCopy(SOURCE, 'El monograma CF, punto por punto.', '   ')).toEqual({
      ok: false,
      reason: 'unsafe',
    });
  });

  it('reports a text that is not in the source, that repeats, or that did not change', () => {
    expect(replaceCopy(SOURCE, 'No está.', 'Otro.')).toEqual({ ok: false, reason: 'missing' });
    expect(replaceCopy(SOURCE, 'Violín.', 'Viola.')).toEqual({ ok: false, reason: 'ambiguous' });
    expect(
      replaceCopy(
        SOURCE,
        'El monograma CF, punto por punto.',
        ' El monograma CF,  punto por punto. ',
      ),
    ).toEqual({
      ok: false,
      reason: 'same',
    });
  });
});

describe('copySourcePath', () => {
  it('maps a case or an article to its file, by locale', () => {
    expect(copySourcePath('/works/cuarteto-fratres', 'en')).toBe(
      'src/content/works/en/cuarteto-fratres.mdx',
    );
    expect(copySourcePath('/es/works/cuarteto-fratres', 'en')).toBe(
      'src/content/works/es/cuarteto-fratres.mdx',
    );
    expect(copySourcePath('/es/writings/una-nota/', 'en')).toBe(
      'src/content/writings/es/una-nota.mdx',
    );
  });

  it('gives nothing for any other page or a path that tries to leave the folder', () => {
    for (const path of ['/', '/about', '/works', '/works/../secret', '/works/a/b', '/fr/works/x']) {
      expect(copySourcePath(path, 'en')).toBeNull();
    }
  });
});
