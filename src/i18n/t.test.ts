import { describe, expect, it } from 'vitest';
import { en } from './messages/en';
import { es } from './messages/es';
import { createT, format, getMessages, lookup } from './t';

/** Every dotted path of an object, arrays included as one leaf. */
function paths(node: unknown, prefix = ''): string[] {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) return [prefix];
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe('catalogues', () => {
  it('have the same keys in both languages', () => {
    expect(paths(en)).toEqual(paths(es));
  });

  it('have no empty strings', () => {
    const empty = [...paths(es), ...paths(en)].filter((path) => {
      const value = path
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], es);
      return value === '';
    });
    expect(empty).toEqual([]);
  });

  it('keep the same placeholders in both languages', () => {
    const placeholders = (catalogue: unknown) =>
      paths(catalogue).map((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], catalogue);
        return (
          JSON.stringify(value)
            .match(/\{\w+\}/g)
            ?.sort() ?? []
        );
      });
    expect(placeholders(en)).toEqual(placeholders(es));
  });
});

describe('format', () => {
  it('replaces named placeholders', () => {
    expect(format('© {year} {name}', { year: 2026, name: 'Sebastian' })).toBe('© 2026 Sebastian');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(format('{label} (new tab)', {})).toBe('{label} (new tab)');
  });
});

describe('lookup and createT', () => {
  it('reads a nested string', () => {
    expect(lookup(es, 'hero.menu.copy')).toBe('Copiar');
    expect(createT('en')('nav.works')).toBe('Works');
  });

  it('formats while it translates', () => {
    expect(createT('es')('case.previousLabel', { name: 'Reto MD' })).toBe('Caso anterior: Reto MD');
  });

  it('throws on a key that is not a string', () => {
    // @ts-expect-error: 'hero.menu' is an object, not a message.
    expect(() => lookup(es, 'hero.menu')).toThrow('Missing message: hero.menu');
  });

  it('returns the catalogue of each language', () => {
    expect(getMessages('es')).toBe(es);
    expect(getMessages('en')).toBe(en);
  });
});
