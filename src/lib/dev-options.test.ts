import { describe, expect, it } from 'vitest';
import {
  initialState,
  moveRange,
  optionText,
  paintState,
  pickOption,
  restoreState,
  type OptionGroup,
} from './dev-options';

const GROUPS: OptionGroup[] = [
  {
    id: 'demo',
    label: 'Demo',
    controls: [
      {
        kind: 'choice',
        id: 'title',
        label: 'Title',
        initial: 'a',
        options: [
          { id: 'a', label: 'A', text: { en: 'One', es: 'Uno' } },
          { id: 'b', label: 'B', text: { en: 'Two', es: 'Dos' } },
        ],
      },
      {
        kind: 'choice',
        id: 'angle',
        label: 'Angle',
        initial: 'front',
        options: [
          { id: 'front', label: 'Front', sets: { tilt: 0 } },
          { id: 'side', label: 'Side', sets: { tilt: 90, unknown: 3 } },
        ],
      },
      {
        kind: 'range',
        id: 'tilt',
        label: 'Tilt',
        min: -40,
        max: 40,
        step: 1,
        initial: 5,
        unit: 'deg',
      },
    ],
  },
];

describe('initialState and restoreState', () => {
  it('starts every control at its initial value', () => {
    expect(initialState(GROUPS)).toEqual({
      choices: { title: 'a', angle: 'front' },
      ranges: { tilt: 5 },
    });
  });

  it('keeps what still matches the registry and drops the rest', () => {
    const raw = JSON.stringify({
      choices: { title: 'b', angle: 'gone', other: 'x' },
      ranges: { tilt: 300, other: 1 },
    });
    expect(restoreState(raw, GROUPS)).toEqual({
      choices: { title: 'b', angle: 'front' },
      ranges: { tilt: 40 },
    });
  });

  it('survives nothing stored and broken JSON', () => {
    expect(restoreState(null, GROUPS)).toEqual(initialState(GROUPS));
    expect(restoreState('{', GROUPS)).toEqual(initialState(GROUPS));
    expect(restoreState('3', GROUPS)).toEqual(initialState(GROUPS));
  });
});

describe('pickOption and moveRange', () => {
  it('applies the preset of an option to the ranges it names, clamped', () => {
    const next = pickOption(initialState(GROUPS), GROUPS, 'angle', 'side');
    expect(next.choices.angle).toBe('side');
    expect(next.ranges).toEqual({ tilt: 40 });
  });

  it('ignores an option or a control that does not exist', () => {
    const state = initialState(GROUPS);
    expect(pickOption(state, GROUPS, 'angle', 'nope')).toBe(state);
    expect(pickOption(state, GROUPS, 'tilt', 'a')).toBe(state);
  });

  it('clamps a moved range', () => {
    expect(moveRange(initialState(GROUPS), GROUPS, 'tilt', -90).ranges.tilt).toBe(-40);
    expect(moveRange(initialState(GROUPS), GROUPS, 'tilt', Number.NaN).ranges.tilt).toBe(5);
  });
});

describe('paintState and optionText', () => {
  it('turns choices into data attributes and ranges into custom properties with their unit', () => {
    expect(paintState(initialState(GROUPS), GROUPS)).toEqual({
      attributes: { 'data-opt-title': 'a', 'data-opt-angle': 'front' },
      properties: { '--opt-tilt': '5deg' },
    });
  });

  it('reads the text of the picked option in a language', () => {
    const state = pickOption(initialState(GROUPS), GROUPS, 'title', 'b');
    expect(optionText(state, GROUPS, 'title', 'es')).toBe('Dos');
    expect(optionText(state, GROUPS, 'angle', 'en')).toBeUndefined();
  });
});
