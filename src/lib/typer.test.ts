import { describe, expect, it } from 'vitest';
import { NOT_FOUND_TYPER } from '@/components/motion/presets';
import {
  charPauseMs,
  scheduleDurationMs,
  typeSchedule,
  typerChars,
  typerStateAt,
  type TyperEvent,
  type TyperTiming,
} from './typer';

const TIMING: TyperTiming = {
  charsPerSecond: 100,
  jitter: [0.5, 1.5],
  pauseFactor: { punctuation: 3, space: 2, other: 1 },
  punctuation: '.,:;!?',
  lines: [{ delay: 0 }, { delay: 0.5, prefixDelay: 0.25 }],
};

const mid = () => 0.5;

describe('charPauseMs', () => {
  it('applies the formula of 404-spec §5.1 with the injected random', () => {
    // (1000 / 100) · (0.5 + 0.5 · 1) · 1
    expect(charPauseMs('a', TIMING, 0.5)).toBeCloseTo(10);
    expect(charPauseMs('a', TIMING, 0)).toBeCloseTo(5);
    expect(charPauseMs('a', TIMING, 1)).toBeCloseTo(15);
  });

  it('waits longer after punctuation and after a space', () => {
    for (const char of '.,:;!?') expect(charPauseMs(char, TIMING, 0.5)).toBeCloseTo(30);
    expect(charPauseMs(' ', TIMING, 0.5)).toBeCloseTo(20);
    expect(charPauseMs('-', TIMING, 0.5)).toBeCloseTo(10);
  });

  it('gives 7.5–17.5 ms per letter with the measured preset', () => {
    expect(charPauseMs('a', NOT_FOUND_TYPER, 0)).toBeCloseTo(7.5);
    expect(charPauseMs('a', NOT_FOUND_TYPER, 1)).toBeCloseTo(17.5);
    expect(charPauseMs('.', NOT_FOUND_TYPER, 1)).toBeCloseTo(17.5 * 2.6);
    expect(charPauseMs(' ', NOT_FOUND_TYPER, 1)).toBeCloseTo(17.5 * 1.8);
  });
});

describe('typerChars', () => {
  it('counts code points, so accented letters are one character', () => {
    expect(typerChars('página')).toHaveLength(6);
    expect(typerChars('')).toEqual([]);
  });
});

describe('typeSchedule', () => {
  const lines = [{ text: 'ab' }, { prefix: '> ', text: 'c.' }];
  const events = typeSchedule(lines, TIMING, mid);

  it('runs show → type → characters → done for each line, in order', () => {
    expect(events.map((e) => `${e.line}:${e.kind}${'typed' in e ? e.typed : ''}`)).toEqual([
      '0:show',
      '0:type',
      '0:char1',
      '0:char2',
      '0:done',
      '1:show',
      '1:type',
      '1:char1',
      '1:char2',
      '1:done',
    ]);
  });

  it('shows each character first and waits after it', () => {
    const at = (line: number, kind: TyperEvent['kind'], typed?: number) =>
      events.find(
        (e) =>
          e.line === line &&
          e.kind === kind &&
          (typed === undefined || ('typed' in e && e.typed === typed)),
      )?.atMs;
    expect(at(0, 'show')).toBe(0);
    expect(at(0, 'char', 1)).toBe(0);
    expect(at(0, 'char', 2)).toBeCloseTo(10);
    expect(at(0, 'done')).toBeCloseTo(20);
    // delay 0.5 s, then the prefix, then 0.25 s before typing.
    expect(at(1, 'show')).toBeCloseTo(520);
    expect(at(1, 'type')).toBeCloseTo(770);
    expect(at(1, 'char', 2)).toBeCloseTo(780);
    expect(at(1, 'done')).toBeCloseTo(810);
  });

  it('adds up to the delays, the prefix delays and every pause', () => {
    expect(scheduleDurationMs(events)).toBeCloseTo(500 + 250 + 10 + 10 + 10 + 30);
    expect(scheduleDurationMs([])).toBe(0);
  });

  it('ignores the prefix delay of a line without prefix', () => {
    const plain = typeSchedule([{ text: 'a' }, { text: 'b' }], TIMING, mid);
    const second = plain.filter((e) => e.line === 1);
    expect(second[0].atMs).toBe(second[1].atMs);
  });

  it('starts a line without timing right away', () => {
    const extra = typeSchedule([{ text: 'a' }, { text: 'b' }, { text: 'c' }], TIMING, mid);
    const third = extra.filter((e) => e.line === 2);
    const secondDone = extra.find((e) => e.line === 1 && e.kind === 'done');
    expect(third[0].atMs).toBe(secondDone?.atMs);
  });

  it('never goes back in time', () => {
    const real = typeSchedule(
      Array.from({ length: 10 }, () => ({ prefix: '✓ ', text: 'Hola, mundo.' })),
      NOT_FOUND_TYPER,
      Math.random,
    );
    for (let i = 1; i < real.length; i += 1) {
      expect(real[i].atMs).toBeGreaterThanOrEqual(real[i - 1].atMs);
    }
  });
});

describe('typerStateAt', () => {
  const lines = [{ text: 'ab' }, { prefix: '> ', text: 'c.' }];
  const events = typeSchedule(lines, TIMING, mid);

  it('shows the first line with its caret at the start', () => {
    const { lines: state, finished } = typerStateAt(events, 2, 0);
    expect(state[0]).toEqual({ visible: true, caret: true, typed: 1, done: false });
    expect(state[1]).toEqual({ visible: false, caret: false, typed: 0, done: false });
    expect(finished).toBe(false);
  });

  it('hides the caret between lines and while the prefix waits', () => {
    expect(typerStateAt(events, 2, 300).lines.map((l) => l.caret)).toEqual([false, false]);
    const waiting = typerStateAt(events, 2, 600).lines[1];
    expect(waiting).toEqual({ visible: true, caret: false, typed: 0, done: false });
    expect(typerStateAt(events, 2, 775).lines[1]).toEqual({
      visible: true,
      caret: true,
      typed: 1,
      done: false,
    });
  });

  it('is finished at the end and at Infinity', () => {
    expect(typerStateAt(events, 2, scheduleDurationMs(events)).finished).toBe(true);
    const all = typerStateAt(events, 2, Infinity);
    expect(all.finished).toBe(true);
    expect(all.lines.map((l) => l.typed)).toEqual([2, 2]);
    expect(all.lines.every((l) => l.visible && !l.caret)).toBe(true);
  });
});
