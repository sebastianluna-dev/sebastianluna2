import { describe, expect, it } from 'vitest';
import { about as aboutEn } from './messages/en/about';
import { about as aboutEs } from './messages/es/about';

// Copy checks of /about (fase7-plan §6.3): lengths that keep the reference's line counts, and the
// facts that must never appear (fuentes-about.md §15).
const catalogues = { es: aboutEs, en: aboutEn } as const;
const length = (text: string) => [...text].length;

function allText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(allText);
  if (value && typeof value === 'object') return Object.values(value).flatMap(allText);
  return [];
}

describe.each(Object.entries(catalogues))('about copy (%s)', (_, about) => {
  it('has two hero paragraphs of 230–300 characters', () => {
    expect(about.hero.paragraphs).toHaveLength(2);
    for (const paragraph of about.hero.paragraphs) {
      expect(length(paragraph)).toBeGreaterThanOrEqual(230);
      expect(length(paragraph)).toBeLessThanOrEqual(300);
    }
  });

  it('has four experience rows with 220–310 character bodies', () => {
    expect(about.experience.items).toHaveLength(4);
    for (const item of about.experience.items) {
      expect(length(item.body)).toBeGreaterThanOrEqual(220);
      expect(length(item.body)).toBeLessThanOrEqual(310);
      expect(item.title.length).toBeGreaterThan(0);
    }
  });

  it('writes the dates as "YYYY — …"', () => {
    for (const item of about.experience.items) {
      expect(item.dates).toMatch(/^\d{4} — \S+$/);
    }
  });

  it('keeps the email label template', () => {
    expect(about.hero.email.copyLabel).toContain('{email}');
  });

  it('never claims what has no source', () => {
    const text = allText(about).join('\n');
    expect(text).not.toMatch(/Vallarta WKND/i);
    expect(text).not.toMatch(/\b338\b/);
    expect(text).not.toMatch(/Lighthouse/i);
  });
});

describe('about copy (both languages)', () => {
  it('uses the same experience ids, in the same order', () => {
    expect(aboutEn.experience.items.map((item) => item.id)).toEqual(
      aboutEs.experience.items.map((item) => item.id),
    );
    expect(aboutEs.experience.items.map((item) => item.id)).toEqual([
      'chess',
      'consulting',
      'health',
      'stores',
    ]);
  });

  it('keeps proper names as titles in both languages', () => {
    expect(aboutEn.experience.items.map((item) => item.title)).toEqual(
      aboutEs.experience.items.map((item) => item.title),
    );
  });
});
