/**
 * Schedule of the 404 terminal (RT-07…RT-09, docs/analisis/404-spec.md §5).
 *
 * Lines are typed one after another: wait the line's `delay`, show its prefix at once, wait its
 * `prefixDelay` (when it has a prefix), then reveal the text one character at a time. Each character
 * appears first and the pause comes after it:
 * `(1000 / charsPerSecond) · (jitter[0] + random · (jitter[1] − jitter[0])) · factor`, where the
 * factor is larger after punctuation and spaces. `random` is injected so the schedule is testable.
 *
 * The engine (`not-found/typer.client.ts`) computes the schedule once and, on every frame, applies
 * `typerStateAt(schedule, elapsed)`; finishing at once is `typerStateAt(schedule, Infinity)`.
 */

export interface TyperLine {
  /** Shown at once, before the text (`✓ `, `> `). */
  readonly prefix?: string;
  /** Typed one character (code point) at a time. */
  readonly text: string;
}

export interface TyperLineTiming {
  /** Seconds to wait before the line starts. */
  readonly delay: number;
  /** Seconds between the prefix and the first character (lines with a prefix only). */
  readonly prefixDelay?: number;
}

export interface TyperTiming {
  readonly charsPerSecond: number;
  /** Range of the random multiplier of each pause. */
  readonly jitter: readonly [number, number];
  readonly pauseFactor: {
    readonly punctuation: number;
    readonly space: number;
    readonly other: number;
  };
  /** Characters that take the punctuation factor. */
  readonly punctuation: string;
  readonly lines: readonly TyperLineTiming[];
}

/**
 * - `show`: the line becomes visible with its prefix; no caret yet.
 * - `type`: typing starts; the caret shows after the (still empty) text.
 * - `char`: `typed` characters are visible.
 * - `done`: the whole line is visible and the caret leaves it.
 */
export type TyperEvent =
  | { readonly kind: 'show' | 'type' | 'done'; readonly line: number; readonly atMs: number }
  | { readonly kind: 'char'; readonly line: number; readonly atMs: number; readonly typed: number };

export interface TyperLineState {
  visible: boolean;
  caret: boolean;
  /** Characters revealed. */
  typed: number;
  done: boolean;
}

export interface TyperState {
  lines: TyperLineState[];
  /** Every line is done: the final cursor may blink. */
  finished: boolean;
}

/** Characters of a line as the typer counts them (code points, so `á` is one). */
export function typerChars(text: string): string[] {
  return Array.from(text);
}

/** Pause in ms after `char` is shown. `random` is a value in [0, 1). */
export function charPauseMs(char: string, timing: TyperTiming, random: number): number {
  const [low, high] = timing.jitter;
  const factor = timing.punctuation.includes(char)
    ? timing.pauseFactor.punctuation
    : char === ' '
      ? timing.pauseFactor.space
      : timing.pauseFactor.other;
  return (1000 / timing.charsPerSecond) * (low + random * (high - low)) * factor;
}

/** Every event of the session, in time order. A line without timing starts right away. */
export function typeSchedule(
  lines: readonly TyperLine[],
  timing: TyperTiming,
  random: () => number = Math.random,
): TyperEvent[] {
  const events: TyperEvent[] = [];
  let at = 0;
  lines.forEach((line, index) => {
    const lineTiming = timing.lines[index] ?? { delay: 0 };
    at += lineTiming.delay * 1000;
    events.push({ kind: 'show', line: index, atMs: at });
    if (line.prefix) at += (lineTiming.prefixDelay ?? 0) * 1000;
    events.push({ kind: 'type', line: index, atMs: at });
    typerChars(line.text).forEach((char, offset) => {
      events.push({ kind: 'char', line: index, atMs: at, typed: offset + 1 });
      at += charPauseMs(char, timing, random());
    });
    events.push({ kind: 'done', line: index, atMs: at });
  });
  return events;
}

/** Time of the last event: when the final cursor starts. */
export function scheduleDurationMs(events: readonly TyperEvent[]): number {
  return events.length ? events[events.length - 1].atMs : 0;
}

/** State of every line `elapsedMs` after the start (`Infinity` = everything typed). */
export function typerStateAt(
  events: readonly TyperEvent[],
  lineCount: number,
  elapsedMs: number,
): TyperState {
  const lines: TyperLineState[] = Array.from({ length: lineCount }, () => ({
    visible: false,
    caret: false,
    typed: 0,
    done: false,
  }));
  for (const event of events) {
    if (event.atMs > elapsedMs) break;
    const line = lines[event.line];
    if (!line) continue;
    switch (event.kind) {
      case 'show':
        line.visible = true;
        break;
      case 'type':
        line.caret = true;
        break;
      case 'char':
        line.typed = event.typed;
        break;
      case 'done':
        line.caret = false;
        line.done = true;
        break;
    }
  }
  return { lines, finished: lines.every((line) => line.done) };
}
