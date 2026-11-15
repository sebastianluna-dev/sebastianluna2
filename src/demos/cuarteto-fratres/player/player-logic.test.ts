import { describe, expect, it } from 'vitest';
import {
  INITIAL_PLAYER,
  filterTracks,
  formatTrackPosition,
  formatTrackTime,
  grooveDrawing,
  miniPlayerShown,
  pageCount,
  pageItems,
  reducePlayer,
  type PlayerState,
} from './player-logic';

const DURATIONS = [264, 299, 493];

describe('formatTrackTime', () => {
  it('writes m:ss and drops fractions', () => {
    expect(formatTrackTime(0)).toBe('0:00');
    expect(formatTrackTime(59.9)).toBe('0:59');
    expect(formatTrackTime(858)).toBe('14:18');
  });

  it('never goes negative', () => {
    expect(formatTrackTime(-3)).toBe('0:00');
    expect(formatTrackTime(Number.NaN)).toBe('0:00');
  });

  it('says the position in Spanish', () => {
    expect(formatTrackPosition(43, 210)).toBe('0:43 de 3:30');
  });
});

describe('filterTracks and pages', () => {
  const tracks = [{ categoryId: 'a' }, { categoryId: 'b' }, { categoryId: 'a' }];

  it('keeps every work with no filter and their indexes with one', () => {
    expect(filterTracks(tracks, null)).toHaveLength(3);
    expect(filterTracks(tracks, 'a').map((row) => row.index)).toEqual([0, 2]);
  });

  it('counts at least one page', () => {
    expect(pageCount(0, 6)).toBe(1);
    expect(pageCount(8, 6)).toBe(2);
    expect(pageCount(8, 4)).toBe(2);
  });

  it('slices a page and clamps one past the end', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(pageItems(items, 1, 6)).toEqual([7, 8]);
    expect(pageItems(items, 5, 6)).toEqual([7, 8]);
  });
});

describe('reducePlayer', () => {
  const playing: PlayerState = { selected: 1, status: 'playing', elapsed: 40 };

  it('plays another row from the top', () => {
    expect(reducePlayer(playing, { type: 'select', index: 2 }, DURATIONS)).toEqual({
      ...playing,
      selected: 2,
      elapsed: 0,
    });
  });

  it('pauses the sounding row when it is pressed again', () => {
    expect(reducePlayer(playing, { type: 'select', index: 1 }, DURATIONS).status).toBe('paused');
  });

  it('plays the first row from idle even though it is already on the record', () => {
    expect(reducePlayer(INITIAL_PLAYER, { type: 'select', index: 0 }, DURATIONS).status).toBe(
      'playing',
    );
  });

  it('wraps the steps around the programme', () => {
    const first = { ...playing, selected: 0 };
    expect(reducePlayer(first, { type: 'step', delta: -1 }, DURATIONS).selected).toBe(2);
  });

  it('seeks to a share of the work, clamped', () => {
    expect(reducePlayer(playing, { type: 'seek', fraction: 0.5 }, DURATIONS).elapsed).toBe(149.5);
    expect(reducePlayer(playing, { type: 'seek', fraction: 3 }, DURATIONS).elapsed).toBe(299);
  });

  it('clamps the clock to the work', () => {
    expect(reducePlayer(playing, { type: 'tick', elapsed: 999 }, DURATIONS).elapsed).toBe(299);
  });

  it('stops at the end, back at the start', () => {
    expect(reducePlayer(playing, { type: 'ended' }, DURATIONS)).toMatchObject({
      status: 'paused',
      elapsed: 0,
    });
  });
});

describe('miniPlayerShown', () => {
  it('rides in the corner while a work sounds and the card is off screen', () => {
    expect(miniPlayerShown(true, false, false)).toBe(true);
    expect(miniPlayerShown(true, true, false)).toBe(false);
    expect(miniPlayerShown(false, false, false)).toBe(false);
  });

  it('waits a moment after a pause, and leaves at once when the card comes back', () => {
    expect(miniPlayerShown(false, false, true)).toBe(true);
    expect(miniPlayerShown(false, true, true)).toBe(false);
  });
});

describe('grooveDrawing', () => {
  it('has no played ring at the start', () => {
    const drawing = grooveDrawing(0);
    expect(drawing.band).toBeNull();
    expect(drawing.needle).toBe(49.5);
  });

  it('brings the needle to the label at the end', () => {
    expect(grooveDrawing(1).needle).toBe(19);
    expect(grooveDrawing(1).grooves.length).toBeGreaterThan(10);
  });
});
