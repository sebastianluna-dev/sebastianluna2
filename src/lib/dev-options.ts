/**
 * State of the dev options menu (`src/dev/`): which variant of each choice is picked and the value of
 * each range. Pure, so the menu's script only reads the DOM and writes what these functions return.
 */

export interface ChoiceOption {
  id: string;
  label: string;
  /** Replaces the text of every `[data-opt-text="<control id>"]`, per language. */
  text?: { en: string; es: string };
  /** Picking the option also moves these ranges (a preset). */
  sets?: Readonly<Record<string, number>>;
}

export interface ChoiceControl {
  kind: 'choice';
  id: string;
  label: string;
  options: readonly ChoiceOption[];
  /** Id of the option picked while nothing is stored. */
  initial: string;
}

export interface RangeControl {
  kind: 'range';
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  /** CSS unit of the custom property: `deg`, `px`, `%` or none. */
  unit: string;
}

export type OptionControl = ChoiceControl | RangeControl;

export interface OptionGroup {
  id: string;
  label: string;
  /** Path prefix where the group applies; the menu dims it elsewhere. */
  where?: string;
  controls: readonly OptionControl[];
}

export interface OptionsState {
  choices: Record<string, string>;
  ranges: Record<string, number>;
}

const controlsOf = (groups: readonly OptionGroup[]): OptionControl[] =>
  groups.flatMap((group) => [...group.controls]);

/** Every control at its initial value. */
export function initialState(groups: readonly OptionGroup[]): OptionsState {
  const state: OptionsState = { choices: {}, ranges: {} };
  for (const control of controlsOf(groups)) {
    if (control.kind === 'choice') state.choices[control.id] = control.initial;
    else state.ranges[control.id] = control.initial;
  }
  return state;
}

const clamp = (value: number, control: RangeControl): number =>
  Math.min(control.max, Math.max(control.min, value));

/**
 * What was stored, kept only where it still matches the registry: unknown controls and options are
 * dropped, numbers are clamped, and whatever is missing takes its initial value.
 */
export function restoreState(raw: string | null, groups: readonly OptionGroup[]): OptionsState {
  const state = initialState(groups);
  if (!raw) return state;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return state;
  }
  if (!stored || typeof stored !== 'object') return state;
  const { choices, ranges } = stored as Partial<Record<keyof OptionsState, unknown>>;
  for (const control of controlsOf(groups)) {
    if (control.kind === 'choice') {
      const picked = (choices as Record<string, unknown> | undefined)?.[control.id];
      if (control.options.some((option) => option.id === picked)) {
        state.choices[control.id] = picked as string;
      }
    } else {
      const value = (ranges as Record<string, unknown> | undefined)?.[control.id];
      if (typeof value === 'number' && Number.isFinite(value)) {
        state.ranges[control.id] = clamp(value, control);
      }
    }
  }
  return state;
}

/** The state after picking an option: the choice changes and its preset moves the ranges it names. */
export function pickOption(
  state: OptionsState,
  groups: readonly OptionGroup[],
  controlId: string,
  optionId: string,
): OptionsState {
  const control = controlsOf(groups).find((entry) => entry.id === controlId);
  if (!control || control.kind !== 'choice') return state;
  const option = control.options.find((entry) => entry.id === optionId);
  if (!option) return state;
  const ranges = { ...state.ranges };
  for (const [rangeId, value] of Object.entries(option.sets ?? {})) {
    const range = controlsOf(groups).find((entry) => entry.id === rangeId);
    if (range?.kind === 'range') ranges[rangeId] = clamp(value, range);
  }
  return { choices: { ...state.choices, [controlId]: optionId }, ranges };
}

/** The state after moving a range. */
export function moveRange(
  state: OptionsState,
  groups: readonly OptionGroup[],
  controlId: string,
  value: number,
): OptionsState {
  const control = controlsOf(groups).find((entry) => entry.id === controlId);
  if (!control || control.kind !== 'range' || !Number.isFinite(value)) return state;
  return { ...state, ranges: { ...state.ranges, [controlId]: clamp(value, control) } };
}

/** `data-opt-<id>` on `<html>`: what CSS and markup read a choice from. */
export const choiceAttribute = (controlId: string): string => `data-opt-${controlId}`;

/** `--opt-<id>` on `<html>`: what CSS reads a range from. */
export const rangeProperty = (controlId: string): string => `--opt-${controlId}`;

/** Attributes and custom properties that paint a state on the root element. */
export function paintState(
  state: OptionsState,
  groups: readonly OptionGroup[],
): { attributes: Record<string, string>; properties: Record<string, string> } {
  const attributes: Record<string, string> = {};
  const properties: Record<string, string> = {};
  for (const control of controlsOf(groups)) {
    if (control.kind === 'choice') {
      attributes[choiceAttribute(control.id)] = state.choices[control.id] ?? control.initial;
    } else {
      const value = state.ranges[control.id] ?? control.initial;
      properties[rangeProperty(control.id)] = `${value}${control.unit}`;
    }
  }
  return { attributes, properties };
}

/** The text an option gives to `[data-opt-text]` in a language, if it carries one. */
export function optionText(
  state: OptionsState,
  groups: readonly OptionGroup[],
  controlId: string,
  locale: 'en' | 'es',
): string | undefined {
  const control = controlsOf(groups).find((entry) => entry.id === controlId);
  if (!control || control.kind !== 'choice') return undefined;
  const picked = state.choices[control.id] ?? control.initial;
  return control.options.find((option) => option.id === picked)?.text?.[locale];
}
