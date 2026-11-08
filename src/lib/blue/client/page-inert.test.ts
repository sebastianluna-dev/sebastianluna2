import { describe, expect, it } from 'vitest';
import { makeSiblingsInert } from './page-inert';

const node = (inert = false) => ({ inert });

describe('makeSiblingsInert', () => {
  it('makes everything but Blue inert and undoes exactly that', () => {
    const [skip, header, main, footer, blue] = [node(), node(), node(), node(), node()];
    const release = makeSiblingsInert([skip, header, main, footer, blue], blue);
    expect([skip, header, main, footer].every((n) => n.inert)).toBe(true);
    expect(blue.inert).toBe(false);
    release();
    expect([skip, header, main, footer, blue].some((n) => n.inert)).toBe(false);
  });

  it('leaves alone a node that was already inert', () => {
    const dialog = node(true);
    const main = node();
    const release = makeSiblingsInert([dialog, main], null);
    release();
    expect(dialog.inert).toBe(true);
    expect(main.inert).toBe(false);
  });
});
