import { describe, expect, it } from 'vitest';
import {
  ABOUT_APPEAR,
  ABOUT_EXPERIENCE_REVEAL,
  APPEAR_PRESETS,
  CASE_APPEAR,
  NOT_FOUND_TYPER,
  WRITING_APPEAR,
  isAppearPresetName,
  type AppearSlot,
} from './presets';

describe('phase 7 appear presets (fase7-plan §5.1)', () => {
  it.each([
    ['fadeUpY2Tween018OutQuint', 0.001, 2, 1, 180],
    ['fadeUpY8Tween024OutQuint', 0.001, 8, 1, 240],
    ['fadeUpY5Tween022OutQuint', 0.001, 5, 1, 220],
    ['inViewFadeUpY8Tween024OutQuint', 0, 8, 1, 240],
    ['inViewFadeUpY8O040Tween024OutQuint', 0, 8, 0.4, 240],
  ] as const)('%s goes from opacity %s, y %s to opacity %s in %s ms', (name, o0, y0, o1, ms) => {
    const preset = APPEAR_PRESETS[name];
    expect(preset.initial).toEqual({ opacity: o0, y: y0 });
    expect(preset.animate).toEqual({ opacity: o1, y: 0 });
    expect(preset.timing.durationMs).toBe(ms);
    expect(preset.transition).toMatchObject({ type: 'tween', duration: ms / 1000 });
  });

  it('keeps the home tip preset apart from the /about one', () => {
    expect(APPEAR_PRESETS.fadeUpY5Tween024OutQuint.timing.durationMs).toBe(240);
    expect(APPEAR_PRESETS.fadeUpY5Tween022OutQuint.timing.durationMs).toBe(220);
  });

  const slots = (group: Record<string, AppearSlot>) => Object.values(group);

  it('slot groups only name existing presets', () => {
    for (const slot of [
      ...slots(ABOUT_APPEAR),
      ...slots(ABOUT_EXPERIENCE_REVEAL.slots),
      ...slots(WRITING_APPEAR),
    ]) {
      expect(isAppearPresetName(slot.preset)).toBe(true);
    }
  });

  it('plays the /about hero in the reference order (about-spec §4.2)', () => {
    expect(slots(ABOUT_APPEAR).map((slot) => slot.delay)).toEqual([0, 0.1, 0.18, 0.3, 0.42, 0.5]);
  });

  it('makes Experience reversible at a .35 ratio with a 0 / .08 / .16 stagger (about-spec §4.3)', () => {
    expect(ABOUT_EXPERIENCE_REVEAL.threshold).toBe(0.35);
    expect(ABOUT_EXPERIENCE_REVEAL.once).toBe(false);
    const { label, date, title, body } = ABOUT_EXPERIENCE_REVEAL.slots;
    expect([label.delay, date.delay, title.delay, body.delay]).toEqual([0, 0, 0.08, 0.16]);
  });

  it('nests the writing article like the case hero (writings-spec §4.1)', () => {
    expect(WRITING_APPEAR.hero).toEqual(CASE_APPEAR.title);
    expect(WRITING_APPEAR.heading).toEqual(CASE_APPEAR.heading);
    expect(slots(WRITING_APPEAR).map((slot) => slot.delay)).toEqual([0, 0.05, 0.1, 0.15]);
  });
});

describe('NOT_FOUND_TYPER (404-spec §5.2)', () => {
  it('has ten lines whose prefixed ones carry a prefix delay', () => {
    expect(NOT_FOUND_TYPER.lines).toHaveLength(10);
    const prefixed = NOT_FOUND_TYPER.lines.flatMap((line, index) =>
      'prefixDelay' in line ? [index] : [],
    );
    expect(prefixed).toEqual([2, 3, 4, 5, 9]);
  });

  it('types at 80 characters per second with the measured jitter and factors', () => {
    expect(NOT_FOUND_TYPER.charsPerSecond).toBe(80);
    expect(NOT_FOUND_TYPER.jitter).toEqual([0.6, 1.4]);
    expect(NOT_FOUND_TYPER.pauseFactor).toEqual({ punctuation: 2.6, space: 1.8, other: 1 });
    expect(NOT_FOUND_TYPER.cursorKeyframes).toEqual([0.2, 1, 0.2]);
  });
});
