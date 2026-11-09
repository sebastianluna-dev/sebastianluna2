// Interface sounds (decisiones.md 30), synthesised with Web Audio instead of shipped as files:
// short tones with a pitch sweep and filtered noise bursts. Each one follows the timing, pitch
// contour and loudness measured on the reference's sound of the same moment (its files are not
// reused): bubble pops to open and close Blue, key taps when a question is sent, droid chirps when
// Blue speaks and a switch click for the theme. Each part is at most 0.2 of full scale; the heard
// peaks follow the reference's level after its own volumes (0.2 for the chat, 0.75 for the rest).
// The /about books are the exception: no recipe sounded like paper, so they play a CC0 recording
// (`samples.ts`).

import type { SampleName } from './samples';

/** The synthesised sounds, one recipe each. */
export type RecipeName = 'openChat' | 'closeChat' | 'typing' | 'droid' | 'theme';

/** Every interface sound: the recipes here and the recordings of `samples.ts`. */
export type SoundName = RecipeName | SampleName;

/** A tone whose pitch glides from `from` to `to` (Hz) in `glide` s. Times in seconds. */
export interface TonePart {
  kind: 'tone';
  at: number;
  duration: number;
  wave: 'sine' | 'triangle';
  from: number;
  to: number;
  glide: number;
  gain: number;
}

/** A burst of white noise through one filter. Times in seconds. */
export interface NoisePart {
  kind: 'noise';
  at: number;
  duration: number;
  filter: 'bandpass' | 'highpass';
  frequency: number;
  q: number;
  gain: number;
}

export type SoundPart = TonePart | NoisePart;

/** Blue's greeting chirp waits for the open pops to end (ms). */
export const GREETING_SOUND_DELAY_MS = 150;

/** Every part starts with this attack (s) and decays exponentially to its end. */
export const SOUND_ATTACK = 0.002;

/** Length (s) of the one white-noise buffer every noise part plays: no noise part is longer. */
export const NOISE_LENGTH = 0.1;

/** Sounds that share a channel cut each other: a new one fades out the one still playing. */
export type SoundChannel = 'book';

/** The channel of each sound; the rest play on their own and overlap freely. */
export const SOUND_CHANNEL: Partial<Record<SoundName, SoundChannel>> = {
  // As in the reference, the next book sound stops the previous one (leaving one book for another
  // plays the close and, at once, the open over it).
  bookOpen: 'book',
  bookClose: 'book',
};

/** Fade (s) of the sound a channel cuts: a few ms, short enough to vanish, long enough not to click. */
export const CHANNEL_CUT = 0.004;

/** A bubble: a fast fall to its note, with a click on top and, unless `body` is off, a low body. */
const pop = (
  at: number,
  from: number,
  to: number,
  duration: number,
  gain: number,
  { body = true } = {},
): SoundPart[] => [
  { kind: 'tone', at, duration, wave: 'sine', from, to, glide: duration * 0.25, gain },
  ...(body
    ? [
        {
          kind: 'tone',
          at,
          duration,
          wave: 'sine',
          from: 260,
          to: 180,
          glide: duration,
          gain: gain * 0.8,
        } satisfies SoundPart,
      ]
    : []),
  {
    kind: 'noise',
    at,
    duration: 0.008,
    filter: 'highpass',
    frequency: 3000,
    q: 0.7,
    gain: gain * 0.25,
  },
];

const tap = (at: number, gain: number): SoundPart[] => [
  { kind: 'noise', at, duration: 0.03, filter: 'bandpass', frequency: 2400, q: 0.9, gain },
  { kind: 'tone', at, duration: 0.045, wave: 'triangle', from: 190, to: 120, glide: 0.03, gain },
];

const click = (at: number, gain: number): SoundPart[] => [
  { kind: 'noise', at, duration: 0.012, filter: 'highpass', frequency: 2500, q: 0.7, gain },
  {
    kind: 'tone',
    at,
    duration: 0.02,
    wave: 'sine',
    from: 3200,
    to: 2600,
    glide: 0.02,
    gain: gain * 0.4,
  },
];

const chirp = (
  at: number,
  from: number,
  to: number,
  gain: number,
  duration = 0.07,
): SoundPart[] => [
  { kind: 'tone', at, duration, wave: 'sine', from, to, glide: duration * 0.7, gain },
  {
    kind: 'noise',
    at,
    duration: 0.006,
    filter: 'highpass',
    frequency: 4000,
    q: 0.7,
    gain: gain * 0.3,
  },
];

/** Level of the open pops: a −15 dBFS peak, like the rest. */
const OPEN_GAIN = 0.15;

/** Each sound is a list of variants; one is picked at random each time (`droid` has three). */
export const SOUNDS: Record<RecipeName, SoundPart[][]> = {
  // "Pop and answer" (Sebastian's pick of ten): a low bubble, then a high one.
  openChat: [
    [
      ...pop(0, 1400, 420, 0.055, OPEN_GAIN, { body: false }),
      ...pop(0.07, 2200, 820, 0.05, OPEN_GAIN, { body: false }),
    ],
  ],
  // The same pops, the second one longer and lower.
  closeChat: [[...pop(0, 1800, 520, 0.05, 0.095), ...pop(0.065, 1700, 380, 0.085, 0.095)]],
  // Four key taps.
  typing: [[...tap(0, 0.12), ...tap(0.135, 0.1), ...tap(0.245, 0.11), ...tap(0.305, 0.09)]],
  droid: [
    // Four rising chirps.
    [
      ...chirp(0, 700, 900, 0.13),
      ...chirp(0.1, 760, 980, 0.12),
      ...chirp(0.21, 820, 1050, 0.12),
      ...chirp(0.32, 900, 1100, 0.08),
    ],
    // Two blips sweeping up from low.
    [...chirp(0, 160, 620, 0.15, 0.045), ...chirp(0.05, 200, 700, 0.13, 0.05)],
    // One quick upward sweep.
    [...chirp(0, 420, 1900, 0.13, 0.07)],
  ],
  // A pull switch: click, faint rattle, clack.
  theme: [[...click(0, 0.16), ...click(0.19, 0.05), ...click(0.27, 0.12)]],
};

/** Length of a variant (s): when its last part ends. */
export function soundLength(parts: SoundPart[]): number {
  return parts.reduce((end, part) => Math.max(end, part.at + part.duration), 0);
}
