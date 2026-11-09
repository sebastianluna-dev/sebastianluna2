// The /about "Readings" shelf (fase7-plan §1.5). Empty until Sebastian gives his list (title, author
// and a "year · kind" line); meanwhile the shelf paints eight neutral, decorative books. Titles and
// authors are proper names, so they are not translated.

export interface Reading {
  title: string;
  author: string;
  /** "year · kind", e.g. "2019 · Ensayo". */
  meta: string;
}

export const READINGS: Reading[] = [];

/** Neutral books the shelf paints while `READINGS` is empty (the reference shows eight). */
export const READING_PLACEHOLDER_COUNT = 8;
