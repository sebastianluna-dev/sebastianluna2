import { describe, expect, it } from 'vitest';
import {
  CLOSED_BOOK,
  isBookOpen,
  nextBookState,
  type BookChange,
  type BookFlags,
} from './book-sound';

/** Runs a list of changes from a closed book and returns the sounds played. */
function play(changes: BookChange[], canHover = true): (string | null)[] {
  let flags: BookFlags = { ...CLOSED_BOOK };
  return changes.map((change) => {
    const result = nextBookState(flags, change, canHover);
    flags = result.flags;
    return result.sound;
  });
}

describe('isBookOpen', () => {
  it('is open while any flag holds it', () => {
    expect(isBookOpen(CLOSED_BOOK)).toBe(false);
    expect(isBookOpen({ ...CLOSED_BOOK, hover: true })).toBe(true);
    expect(isBookOpen({ ...CLOSED_BOOK, focus: true })).toBe(true);
    expect(isBookOpen({ ...CLOSED_BOOK, held: true })).toBe(true);
  });
});

describe('nextBookState', () => {
  it('opens on mouse enter and closes on leave', () => {
    expect(
      play([
        { cause: 'hover', on: true },
        { cause: 'hover', on: false },
      ]),
    ).toEqual(['bookOpen', 'bookClose']);
  });

  it('opens and closes with the visible focus', () => {
    expect(
      play([
        { cause: 'focus', on: true },
        { cause: 'focus', on: false },
      ]),
    ).toEqual(['bookOpen', 'bookClose']);
  });

  it('plays nothing when the state does not flip', () => {
    // Focused, then hovered and left: the book stays open throughout.
    expect(
      play([
        { cause: 'focus', on: true },
        { cause: 'hover', on: true },
        { cause: 'hover', on: false },
        { cause: 'focus', on: false },
      ]),
    ).toEqual(['bookOpen', null, null, 'bookClose']);
    // A repeated enter (moving inside the book) does not re-trigger.
    expect(
      play([
        { cause: 'hover', on: true },
        { cause: 'hover', on: true },
      ]),
    ).toEqual(['bookOpen', null]);
    expect(play([{ cause: 'hover', on: false }])).toEqual([null]);
  });

  it('stays silent when the focus becomes visible under the mouse, until both have gone', () => {
    // Hovered, clicked (no visible focus), a key turns `:focus-visible` on: the book stays open
    // when the mouse leaves and only closes when the focus leaves too.
    expect(
      play([
        { cause: 'hover', on: true },
        { cause: 'focus', on: true },
        { cause: 'hover', on: false },
        { cause: 'focus', on: false },
      ]),
    ).toEqual(['bookOpen', null, null, 'bookClose']);
    // Clicked, then the mouse left (closed), then a key shows the focus: it opens again.
    expect(
      play([
        { cause: 'hover', on: true },
        { cause: 'hover', on: false },
        { cause: 'focus', on: true },
      ]),
    ).toEqual(['bookOpen', 'bookClose', 'bookOpen']);
  });

  it('never plays for a held finger, even when it is what opens or closes the book', () => {
    expect(
      play([
        { cause: 'held', on: true },
        { cause: 'held', on: false },
      ]),
    ).toEqual([null, null]);
    // Held, then focused and released: the focus does not flip the state either.
    expect(
      play([
        { cause: 'held', on: true },
        { cause: 'focus', on: true },
        { cause: 'held', on: false },
        { cause: 'focus', on: false },
      ]),
    ).toEqual([null, null, null, 'bookClose']);
  });

  it('stays silent without a fine pointer that hovers, but keeps the flags', () => {
    expect(
      play(
        [
          { cause: 'hover', on: true },
          { cause: 'focus', on: true },
          { cause: 'focus', on: false },
        ],
        false,
      ),
    ).toEqual([null, null, null]);
    const { flags } = nextBookState(CLOSED_BOOK, { cause: 'focus', on: true }, false);
    expect(flags).toEqual({ hover: false, focus: true, held: false });
  });

  it('does not mutate the flags it receives', () => {
    const flags = { ...CLOSED_BOOK };
    nextBookState(flags, { cause: 'hover', on: true }, true);
    expect(flags).toEqual(CLOSED_BOOK);
  });
});
