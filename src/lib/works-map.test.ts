import { describe, expect, it } from 'vitest';
import { WORKS_MAP } from '@/components/motion/presets';
import { currentSectionId, inPageTarget } from './works-map';

const sections = (...tops: number[]) =>
  ['overview', 'challenge', 'approach', 'research', 'design', 'outcome']
    .slice(0, tops.length)
    .map((id, index) => ({ id, top: tops[index] }));

describe('currentSectionId', () => {
  it('uses the measured line of the reference (40 % of the viewport)', () => {
    expect(WORKS_MAP.activeLine).toBe(0.4);
  });

  it('falls back to the first section while the hero fills the screen', () => {
    expect(currentSectionId(sections(1200, 2400, 3600), 900)).toBe('overview');
  });

  it('picks the last section whose top is above the line', () => {
    // 40 % of 900 = 360.
    expect(currentSectionId(sections(-1800, -400, 300, 1400), 900)).toBe('approach');
    expect(currentSectionId(sections(-1800, -400, 359.9, 1400), 900)).toBe('approach');
  });

  it('treats a top exactly on the line as below it', () => {
    expect(currentSectionId(sections(-400, 360, 1400), 900)).toBe('overview');
  });

  it('marks the section an anchor jump lands on (scroll margin 196, 266 for design)', () => {
    expect(currentSectionId(sections(-4000, -3000, -2000, 196, 1200), 900)).toBe('research');
    expect(currentSectionId(sections(-5000, -4000, -3000, -1500, 266, 1800), 900)).toBe('design');
  });

  it('keeps the last section once everything is above the line', () => {
    expect(currentSectionId(sections(-5000, -4000, -3000, -2000, -1000, -10), 900)).toBe('outcome');
  });

  it('follows the viewport height and a custom line', () => {
    expect(currentSectionId(sections(-100, 400), 1200)).toBe('challenge');
    expect(currentSectionId(sections(-100, 400), 1200, 0.25)).toBe('overview');
  });

  it('returns null without sections', () => {
    expect(currentSectionId([], 900)).toBeNull();
  });
});

describe('inPageTarget', () => {
  const page = 'https://sebastianluna.dev/works/reto-md';

  it('returns the section of a hash link on the same page', () => {
    expect(inPageTarget('#research', page)).toBe('research');
    expect(inPageTarget('/works/reto-md#design', page)).toBe('design');
    expect(
      inPageTarget('https://sebastianluna.dev/works/reto-md#outcome', `${page}#overview`),
    ).toBe('outcome');
  });

  it('decodes the hash', () => {
    expect(inPageTarget('#caf%C3%A9', page)).toBe('café');
  });

  it('ignores links that leave the page or carry no hash', () => {
    expect(inPageTarget('/works/vallarta-tours#overview', page)).toBeNull();
    expect(inPageTarget('/en/works/reto-md#overview', page)).toBeNull();
    expect(inPageTarget('https://example.com/works/reto-md#overview', page)).toBeNull();
    expect(inPageTarget('/works/reto-md?x=1#overview', page)).toBeNull();
    expect(inPageTarget('/works/reto-md', page)).toBeNull();
    expect(inPageTarget('#', page)).toBeNull();
  });

  it('returns null for an unparsable page URL', () => {
    expect(inPageTarget('#research', 'not a url')).toBeNull();
  });
});
