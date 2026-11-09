// Recorded interface sounds (decisiones.md 30): the /about books play a real page turn instead of a
// synthesised one, because no recipe of tones and noise bursts sounded like paper. The recordings are
// CC0 (Kenney's "RPG Audio", `src/assets/sounds/books/`, with the seven Sebastian did not pick);
// Vite emits the one in use as a hashed asset, fetched and decoded once on the first book sound or
// when a shelf binds on a fine-pointer device (`preloadInterfaceSound`).

import pageTurnSlow from '@/assets/sounds/books/page-turn-slow.mp3';

export type SampleName = 'bookOpen' | 'bookClose';

/** One recording and the gain it plays at (unity = the file as levelled). */
export interface Sample {
  url: string;
  gain: number;
}

/**
 * Level of the book recordings: the file's −3 dBFS peak played at 0.45 lands near −10 dBFS, the
 * level Sebastian heard and chose it at.
 */
export const SAMPLE_GAIN = 0.45;

/** Sebastian's pick (option 4 of the eight): one page turned slowly, for opening and closing. */
export const SAMPLES: Record<SampleName, Sample> = {
  bookOpen: { url: pageTurnSlow, gain: SAMPLE_GAIN },
  bookClose: { url: pageTurnSlow, gain: SAMPLE_GAIN },
};

/** Rate (Hz) of every recording. Decoding at it means a 48 kHz output plays the file unresampled. */
export const SAMPLE_RATE = 48000;

/** A recording still loading this long (ms) after its gesture no longer plays: it would feel late. */
export const SAMPLE_LATE_MS = 150;

export function isSample(name: string): name is SampleName {
  return Object.hasOwn(SAMPLES, name);
}

/**
 * Whether a recording that just finished loading still plays: only if it is still the latest sound
 * asked of its channel (a newer one replaced it) and arrived within `SAMPLE_LATE_MS` of its gesture.
 */
export function playsWhenLoaded(requestedAt: number, now: number, latest: boolean): boolean {
  return latest && now - requestedAt <= SAMPLE_LATE_MS;
}
