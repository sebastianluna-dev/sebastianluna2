/**
 * Sounds of the /about books (about-spec §5.3), as the reference does them: a book is open while the
 * mouse is over it, while it has visible keyboard focus or while a finger holds it. When that open
 * state flips because of the mouse or the focus, the book plays `bookOpen` or `bookClose`, and only
 * on a device with a fine pointer that can hover; a held finger opens the book in silence. The open
 * look itself stays in the CSS of BookShelf.astro; this only decides the sound.
 */

/** What keeps a book open. */
export interface BookFlags {
  /** A mouse is over the book. */
  hover: boolean;
  /** The book has keyboard focus that shows (`:focus-visible`). */
  focus: boolean;
  /** A finger or pen holds it down. */
  held: boolean;
}

export type BookCause = keyof BookFlags;

/** One change of one flag: e.g. `{ cause: 'hover', on: false }` when the mouse leaves. */
export interface BookChange {
  cause: BookCause;
  on: boolean;
}

export type BookSound = 'bookOpen' | 'bookClose';

/** Devices whose book changes play a sound: the reference's own media query. */
export const BOOK_SOUND_MEDIA = '(hover: hover) and (pointer: fine)';

export const CLOSED_BOOK: Readonly<BookFlags> = { hover: false, focus: false, held: false };

export function isBookOpen(flags: BookFlags): boolean {
  return flags.hover || flags.focus || flags.held;
}

/**
 * Applies one change to a book's flags. The sound is set only when the book actually opens or
 * closes, the cause is the mouse or the focus, and `canHover` (BOOK_SOUND_MEDIA matches).
 */
export function nextBookState(
  flags: BookFlags,
  change: BookChange,
  canHover: boolean,
): { flags: BookFlags; sound: BookSound | null } {
  const next = { ...flags, [change.cause]: change.on };
  const wasOpen = isBookOpen(flags);
  const open = isBookOpen(next);
  const audible = canHover && change.cause !== 'held' && open !== wasOpen;
  return { flags: next, sound: audible ? (open ? 'bookOpen' : 'bookClose') : null };
}
