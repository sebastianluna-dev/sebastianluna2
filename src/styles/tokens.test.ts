import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REDUCED_HERO_FADE } from '@/components/motion/presets';

const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

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

  it('keeps the reduced hero fade in sync with its preset (HE-10)', () => {
    expect(css).toContain(`--pf-hero-scene-fade: ${REDUCED_HERO_FADE.durationMs}ms;`);
  });
});
