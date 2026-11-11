/**
 * Inner page of the /about books (about-spec §5.3): the title shrinks with its length so it fits the
 * 49 px text column of an 80 × 122 book. Steps measured on the reference (5.2–7.2 px, line height
 * 1.05 of the size). Only used once Sebastian adds books (src/data/readings.ts).
 */
export interface BookTitleSize {
  /** Font size in px. */
  size: number;
  /** Line height in px. */
  lineHeight: number;
}

/** Longest title (characters) each size fits, smallest last. */
const STEPS = [
  { maxLength: 24, size: 7.2 },
  { maxLength: 34, size: 6.4 },
  { maxLength: 45, size: 5.8 },
] as const;
const MIN_SIZE = 5.2;
const LINE_HEIGHT = 1.05;

export function bookTitleSize(title: string): BookTitleSize {
  const length = [...title.trim()].length;
  const size = STEPS.find((step) => length <= step.maxLength)?.size ?? MIN_SIZE;
  return { size, lineHeight: Math.round(size * LINE_HEIGHT * 100) / 100 };
}

/** Accessible name of a book: title, author and its meta line ("year · kind"), skipping blanks. */
export function bookLabel(book: { title: string; author: string; meta: string }): string {
  return [book.title, book.author, book.meta]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Whether /about shows the Readings section. While Sebastian has not given his list, the production
 * build hides it (his call, 2026-11-10) and `astro dev` keeps the neutral books to work on; real
 * books show it everywhere.
 */
export function readingsVisible(books: number, dev: boolean): boolean {
  return dev || books > 0;
}
