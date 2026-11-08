import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPEAR_PRESETS,
  CHAT_ASIDE,
  REDUCED_HERO_FADE,
  SIDE_NOTES_CAROUSEL_QUERY,
} from '@/components/motion/presets';
import { CHAT_AVATAR } from '@/lib/chat-sequence';
import { CASE_COL, GAP, GUTTER, PHONE_GAP, WIDE_MIN } from '@/lib/lightbox';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const css = read('src/styles/tokens.css');

/** Declarations of the first rule whose selector is exactly `selector`, normalised. */
function declarations(selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No rule for ${selector}`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map((declaration) => declaration.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

describe('tokens.css', () => {
  it('declares the same dark values for the manual and the system theme', () => {
    const manual = declarations(":root[data-theme='dark']");
    const system = declarations(":root:not([data-theme='light'])");
    expect(manual.length).toBeGreaterThan(40);
    expect(system).toEqual(manual);
  });

  it('only overrides tokens that exist in the light theme', () => {
    const light = new Set(declarations(':root').map((declaration) => declaration.split(':')[0]));
    const unknown = declarations(":root[data-theme='dark']")
      .map((declaration) => declaration.split(':')[0])
      .filter((name) => !light.has(name));
    expect(unknown).toEqual([]);
  });

  it('keeps the four contrast knobs of decisiones.md 20', () => {
    for (const token of [
      '--pf-text-secondary',
      '--pf-meta-dim',
      '--pf-map-inactive',
      '--pf-prevnext-label',
    ]) {
      expect(css).toContain(`${token}:`);
    }
  });

  it('ends the case year appear at the meta dim of the CSS (CA-01, decisiones.md 20)', () => {
    // If the contrast knob changes, the preset must change with it or the value jumps at the end.
    const { opacity } = APPEAR_PRESETS.fadeUpY20O040SpringB000040.animate;
    expect(css).toContain(`--pf-meta-dim: ${opacity};`);
  });

  it('keeps the reduced hero fade in sync with its preset (HE-10)', () => {
    expect(css).toContain(`--pf-hero-scene-fade: ${REDUCED_HERO_FADE.durationMs}ms;`);
  });

  it('keeps the layout literals of the figure `sizes` in sync (lib/lightbox.ts)', () => {
    expect(css).toContain(`--pf-case-col: ${CASE_COL}px;`);
    expect(css).toContain(`--pf-gutter-case: ${GUTTER}px;`);
    expect(css).toContain(`--pf-gallery-gap: ${GAP}px;`);
    const phone = css.slice(css.indexOf(`@media (max-width: ${WIDE_MIN - 0.02}px)`));
    expect(phone).toContain(`--pf-gallery-gap: ${PHONE_GAP}px;`);
  });

  it('keeps the chat avatar and its portrait crop in sync with lib/chat-sequence.ts', () => {
    expect(css).toContain(`--pf-chat-avatar: ${CHAT_AVATAR.px}px;`);
    const phone = css.slice(css.indexOf(`@media (max-width: ${CHAT_AVATAR.phoneMax}px)`));
    expect(phone).toContain(`--pf-chat-avatar: ${CHAT_AVATAR.phonePx}px;`);
    expect(CHAT_AVATAR.cropWidth).toBe(112 / 60);
    expect(css).toContain('--pf-portrait-crop-width: calc(112 / 60);');
  });

  it('keeps the chat rain glyph in sync with its preset (CA-12)', () => {
    expect(css).toContain(`--pf-chat-rain-glyph: ${CHAT_ASIDE.rain.geometry.glyphPx}px;`);
  });
});

describe('side notes carousel query', () => {
  it('is the same media query in the script and in the CSS of the notes (CA-15)', () => {
    for (const file of [
      'src/components/portfolio/case/SideNotes.astro',
      'src/components/portfolio/case/SideNote.astro',
    ]) {
      expect(read(file)).toContain(`@media ${SIDE_NOTES_CAROUSEL_QUERY}`);
    }
  });
});
