/**
 * Pure logic of the player demo: the clocks, the filter and pages of the programme, the
 * transport's next state and the rail step it shows, and the mini player's grooves.
 */

/** Seconds → "m:ss". Fractions are dropped, never rounded up: 59.9 s is still "0:59". */
export function formatTrackTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** The position as the slider says it, in the site's Spanish: "0:43 de 3:30". */
export function formatTrackPosition(elapsed: number, total: number): string {
  return `${formatTrackTime(elapsed)} de ${formatTrackTime(total)}`;
}

/** The works of a category, keeping their place in the programme; `null` keeps them all. */
export function filterTracks<T extends { categoryId: string }>(
  tracks: readonly T[],
  categoryId: string | null,
): { track: T; index: number }[] {
  return tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => categoryId === null || track.categoryId === categoryId);
}

/** Pages needed for `count` items; at least one, so an empty filter still has a page. */
export function pageCount(count: number, size: number): number {
  return Math.max(1, Math.ceil(count / Math.max(1, size)));
}

/** The items of one page; a page past the end shows the last one. */
export function pageItems<T>(items: readonly T[], page: number, size: number): T[] {
  const last = pageCount(items.length, size) - 1;
  const start = Math.min(Math.max(0, page), last) * size;
  return items.slice(start, start + size);
}

export type PlayerStatus = 'idle' | 'playing' | 'paused';
/** Where the transport shows: the record's card, or the small disc pinned in the corner. */
export type PlayerView = 'card' | 'mini';
export type RailStep = 'idle' | 'playing' | 'paused' | 'mini';

export const RAIL_STEPS: readonly RailStep[] = ['idle', 'playing', 'paused', 'mini'];

export interface PlayerState {
  /** Index of the work on the record: the first one until the reader picks another. */
  selected: number;
  status: PlayerStatus;
  /** Elapsed seconds of the selected work. */
  elapsed: number;
  view: PlayerView;
}

export const INITIAL_PLAYER: PlayerState = {
  selected: 0,
  status: 'idle',
  elapsed: 0,
  view: 'card',
};

export type PlayerAction =
  /** A row of the programme: another work starts from the top, the sounding one pauses. */
  | { type: 'select'; index: number }
  | { type: 'toggle' }
  | { type: 'step'; delta: number }
  | { type: 'seek'; fraction: number }
  /** The clock of the recording, or of the timer standing in for it. */
  | { type: 'tick'; elapsed: number }
  | { type: 'ended' }
  /** The demo left the screen: the music stops there. */
  | { type: 'pause' }
  | { type: 'rail'; step: RailStep };

/**
 * The transport. `durations` are the works' lengths, by index. A pause always brings the record's
 * card back, so the rail can say «Paused»; only a sounding work rides in the corner.
 */
export function reducePlayer(
  state: PlayerState,
  action: PlayerAction,
  durations: readonly number[],
): PlayerState {
  const count = durations.length;
  switch (action.type) {
    case 'select':
      if (action.index === state.selected && state.status !== 'idle') {
        return reducePlayer(state, { type: 'toggle' }, durations);
      }
      return { ...state, selected: action.index, elapsed: 0, status: 'playing' };
    case 'toggle':
      return state.status === 'playing'
        ? { ...state, status: 'paused', view: 'card' }
        : { ...state, status: 'playing' };
    case 'step':
      if (count === 0) return state;
      return {
        ...state,
        selected: (state.selected + action.delta + count) % count,
        elapsed: 0,
        status: 'playing',
      };
    case 'seek': {
      const clamped = Math.min(1, Math.max(0, action.fraction));
      const elapsed = clamped * (durations[state.selected] ?? 0);
      return { ...state, elapsed, status: state.status === 'idle' ? 'paused' : state.status };
    }
    case 'tick':
      return {
        ...state,
        elapsed: Math.min(durations[state.selected] ?? 0, Math.max(0, action.elapsed)),
      };
    case 'ended':
      return { ...state, status: 'paused', elapsed: 0, view: 'card' };
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused', view: 'card' } : state;
    case 'rail':
      switch (action.step) {
        case 'idle':
          return INITIAL_PLAYER;
        case 'playing':
          return { ...state, status: 'playing', view: 'card' };
        case 'paused':
          return { ...state, status: 'paused', view: 'card' };
        case 'mini':
          return { ...state, status: 'playing', view: 'mini' };
      }
  }
}

/** The rail step that describes a state: the corner disc only while a work sounds. */
export function railStepOf(state: PlayerState): RailStep {
  if (state.status === 'playing' && state.view === 'mini') return 'mini';
  return state.status;
}

/** Radii in the mini record's 100×100 drawing: its edge and the edge of the ink label. */
const OUTER_RADIUS = 49.5;
const INNER_RADIUS = 19;
const GROOVE_GAP = 2.3;

export interface GrooveDrawing {
  /** Radius of the needle: where the played part ends. */
  needle: number;
  /** The played ring as one wide stroke; null before the start. */
  band: { radius: number; width: number } | null;
  /** Radii of the grooves drawn inside the played ring, from the edge inwards. */
  grooves: number[];
}

/**
 * The progress as the mini record's grooves (the site's lib/mini-player-card.ts): a record plays
 * from the edge towards the label, so the played part is a ring that widens inwards.
 */
export function grooveDrawing(fraction: number): GrooveDrawing {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  const needle = round(OUTER_RADIUS - clamped * (OUTER_RADIUS - INNER_RADIUS));
  const band =
    clamped > 0
      ? { radius: round((OUTER_RADIUS + needle) / 2), width: round(OUTER_RADIUS - needle) }
      : null;
  const grooves: number[] = [];
  for (let radius = OUTER_RADIUS - 1.4; radius > needle + 0.6; radius -= GROOVE_GAP) {
    grooves.push(round(radius));
  }
  return { needle, band, grooves };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
