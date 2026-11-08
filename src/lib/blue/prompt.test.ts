import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTACT_EMAILS, CV_FILES, PROFILE } from '@/data/profile';
import { LOCALES } from '@/i18n/locales';
import { CASE_SECTION_IDS } from '@/lib/works';
import { blueKnowledge } from './knowledge';
import { blueInstructions, buildBlueSystem } from './prompt';

const slugs = (locale: string) =>
  readdirSync(`src/content/works/${locale}`)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));

describe('buildBlueSystem', () => {
  it.each(LOCALES)(
    'puts the %s knowledge first and the instructions last, both cached',
    (locale) => {
      const system = buildBlueSystem(locale);
      expect(system).toHaveLength(2);
      expect(system[0]).toEqual({
        type: 'text',
        text: blueKnowledge(locale),
        cache_control: { type: 'ephemeral' },
      });
      expect(system[1]).toEqual({
        type: 'text',
        text: blueInstructions(locale),
        cache_control: { type: 'ephemeral' },
      });
    },
  );

  it('is byte-identical between calls, so the prefix stays cached', () => {
    for (const locale of LOCALES) {
      expect(JSON.stringify(buildBlueSystem(locale))).toBe(JSON.stringify(buildBlueSystem(locale)));
    }
  });

  it('is long enough to reach the 512-token cache minimum of Claude Haiku 5.5', () => {
    // A conservative 4 characters per token.
    for (const locale of LOCALES) expect(blueKnowledge(locale).length / 4).toBeGreaterThan(512);
  });

  it('answers in the language of the visitor, else of the page, and links its own cases', () => {
    expect(blueInstructions('es')).toContain('Answer in the language the visitor writes in');
    expect(blueInstructions('es')).toContain('use Spanish, the language of this page');
    expect(blueInstructions('es')).toContain('/works/');
    expect(blueInstructions('es')).toContain(CONTACT_EMAILS.es);
    expect(blueInstructions('en')).toContain('use English, the language of this page');
    expect(blueInstructions('en')).toContain('/en/works/');
    expect(blueInstructions('en')).toContain(CONTACT_EMAILS.en);
  });

  it('writes the name and the Spanish of the site', () => {
    for (const locale of LOCALES) {
      const text = blueInstructions(locale);
      expect(text).toContain('Spell his name "Sebastian", without an accent');
      expect(text).toContain('Spanish as it is spoken in Mexico');
      expect(text).not.toContain('Sebastián');
    }
  });

  it('writes its rules at a normal volume', () => {
    for (const locale of LOCALES) {
      expect(blueInstructions(locale)).not.toMatch(/\b(MUST|NEVER|ALWAYS|IMPORTANT|CRITICAL)\b|!!/);
    }
  });
});

describe('blueKnowledge', () => {
  it.each(LOCALES)('links every section of every %s case, and only existing ones', (locale) => {
    const text = blueKnowledge(locale);
    const prefix = locale === 'es' ? '/works/' : '/en/works/';
    for (const slug of slugs(locale)) {
      for (const id of CASE_SECTION_IDS) expect(text).toContain(`](${prefix}${slug}#${id})`);
    }
    const links = [...text.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]);
    for (const link of links) {
      const match = link.match(/^(?:\/en)?\/works\/([^#]+)#(.+)$/);
      if (match) {
        expect(link.startsWith(prefix)).toBe(true);
        expect(slugs(locale)).toContain(match[1]);
        expect(CASE_SECTION_IDS).toContain(match[2]);
      } else {
        expect([locale === 'es' ? '/#works' : '/en#works', CV_FILES[locale]]).toContain(link);
      }
    }
  });

  it.each(LOCALES)('links only sections that exist in the %s case files', (locale) => {
    const text = blueKnowledge(locale);
    const prefix = locale === 'es' ? '/works/' : '/en/works/';
    for (const [, slug, id] of text.matchAll(/\]\((?:\/en)?\/works\/([^#)]+)#([^)]+)\)/g)) {
      const mdx = readFileSync(`src/content/works/${locale}/${slug}.mdx`, 'utf8');
      expect(mdx, `${prefix}${slug}#${id}`).toContain(`<CaseSection id="${id}"`);
    }
  });

  it.each(LOCALES)('ends with the %s contact data of src/data/profile.ts', (locale) => {
    const text = blueKnowledge(locale);
    for (const value of [
      CONTACT_EMAILS[locale],
      PROFILE.linkedin,
      PROFILE.github,
      CV_FILES[locale],
    ]) {
      expect(text).toContain(value);
    }
  });

  it.each(LOCALES)('leaves out what Blue must not share or cannot back (%s)', (locale) => {
    const text = blueKnowledge(locale);
    // Phone number of the CV, the unverified Lighthouse figures of 365, salary.
    expect(text).not.toMatch(/\+52|229 552|5868/);
    expect(text).not.toMatch(/Lighthouse[^.\n]*\b(99|100)\b/);
    expect(text).not.toMatch(/salar|\$\s?\d|USD|MXN/i);
    // The simulated students are said to be simulated, and Vallarta TOURS a sample.
    expect(text).toMatch(locale === 'es' ? /548 alumnos simulados/ : /548 simulated students/);
    expect(text).toMatch(locale === 'es' ? /marca ficticia/ : /fictional brand/);
  });
});
