import { describe, expect, it } from 'vitest';
import { bookLabel, bookTitleSize } from './books';

describe('bookTitleSize', () => {
  it('follows the measured steps of the reference', () => {
    expect(bookTitleSize('x'.repeat(11)).size).toBe(7.2);
    expect(bookTitleSize('x'.repeat(24)).size).toBe(7.2);
    expect(bookTitleSize('x'.repeat(25)).size).toBe(6.4);
    expect(bookTitleSize('x'.repeat(34)).size).toBe(6.4);
    expect(bookTitleSize('x'.repeat(45)).size).toBe(5.8);
    expect(bookTitleSize('x'.repeat(56)).size).toBe(5.2);
  });

  it('stays between 5.2 and 7.2 px with a 1.05 line height', () => {
    for (const length of [0, 1, 30, 200]) {
      const { size, lineHeight } = bookTitleSize('x'.repeat(length));
      expect(size).toBeGreaterThanOrEqual(5.2);
      expect(size).toBeLessThanOrEqual(7.2);
      expect(lineHeight).toBeCloseTo(size * 1.05, 2);
    }
    expect(bookTitleSize('x'.repeat(25)).lineHeight).toBe(6.72);
  });

  it('counts characters, not UTF-16 units, and ignores outer spaces', () => {
    expect(bookTitleSize(`  ${'é'.repeat(24)}  `).size).toBe(7.2);
  });
});

describe('bookLabel', () => {
  it('joins the parts and skips blanks', () => {
    expect(bookLabel({ title: 'Title', author: 'Author', meta: '2020 · Essay' })).toBe(
      'Title, Author, 2020 · Essay',
    );
    expect(bookLabel({ title: 'Title', author: ' ', meta: '' })).toBe('Title');
  });
});
