// Interface sounds (decisiones.md 31), synthesised with Web Audio instead of shipped as files:
// short tones with a pitch sweep and filtered noise bursts. Each one follows the timing, pitch
// contour and loudness measured on the reference's sound of the same moment (its files are not
// reused): bubble pops to open and close Blue, key taps when a question is sent, droid chirps when
// Blue speaks, a switch click for the theme, and a paper riffle and a thud when an /about book opens
// and closes. Each part is at most 0.2 of full scale; the heard peaks follow the reference's level
// after its own volumes (0.2 for the chat, 0.75 for the rest), which leaves the riffle soft (about
// −26 dBFS) and the thud loud (about −7 dBFS). The book sounds were fitted part by part to the
// spectrum and envelope of the reference's recordings, analysed and not copied.

export type SoundName =
  'openChat' | 'closeChat' | 'typing' | 'droid' | 'theme' | 'bookOpen' | 'bookClose';

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

/** A grain of band-passed noise: `[at, duration, frequency, q, gain]`, times in s. */
type Grain = readonly [number, number, number, number, number];

/** Paper: a train of band-passed noise grains (crackles of pages, the body of a thud). */
const crackles = (grains: readonly Grain[]): SoundPart[] =>
  grains.map(([at, duration, frequency, q, gain]) => ({
    kind: 'noise',
    at,
    duration,
    filter: 'bandpass',
    frequency,
    q,
    gain,
  }));

/** High-passed noise: faint air under a riffle, or the snap on top of a thud. */
const hiss = (at: number, frequency: number, q: number, gain: number, duration = NOISE_LENGTH) =>
  ({ kind: 'noise', at, duration, filter: 'highpass', frequency, q, gain }) satisfies SoundPart;

/** A low sine that falls in pitch: the ring of a cover that hits. */
const ring = (
  at: number,
  duration: number,
  from: number,
  to: number,
  glide: number,
  gain: number,
) => ({ kind: 'tone', at, duration, wave: 'sine', from, to, glide, gain }) satisfies SoundPart;

/** Level of the open pops: a −15 dBFS peak, like the rest. */
const OPEN_GAIN = 0.15;

/** Each sound is a list of variants; one is picked at random each time (`droid` has three, `bookOpen` two). */
export const SOUNDS: Record<SoundName, SoundPart[][]> = {
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
  bookOpen: [
    // A paper riffle: faint air, page crackles at 1–3 kHz that thicken, soft thumps of the pages
    // landing at 0.36–0.5 s, gone by 0.65 s.
    [
      hiss(0, 887, 2.85, 0.00224),
      ...crackles([
        [0.029, 0.1, 1691, 1.85, 0.0142],
        [0.029, 0.022, 77, 1.34, 0.00894],
        [0.094, 0.1, 2237, 2.52, 0.0176],
        [0.119, 0.1, 2064, 1.75, 0.0231],
        [0.159, 0.1, 2366, 2.43, 0.0259],
        [0.174, 0.049, 2140, 1.54, 0.036],
        [0.191, 0.049, 1141, 0.77, 0.0422],
        [0.212, 0.078, 103, 0.82, 0.034],
        [0.214, 0.073, 1634, 1.05, 0.024],
        [0.233, 0.1, 3088, 2.44, 0.0183],
        [0.268, 0.099, 3247, 3, 0.0178],
        [0.298, 0.1, 2487, 1.14, 0.0109],
        [0.323, 0.1, 1523, 0.69, 0.0145],
        [0.358, 0.077, 172, 0.6, 0.122],
        [0.37, 0.064, 1932, 1.22, 0.0483],
        [0.398, 0.1, 579, 0.52, 0.0333],
        [0.43, 0.071, 1370, 0.91, 0.0534],
        [0.437, 0.053, 184, 0.62, 0.0563],
        [0.44, 0.058, 117, 0.86, 0.0434],
        [0.459, 0.09, 724, 1.69, 0.144],
        [0.502, 0.096, 98, 0.89, 0.0634],
        [0.505, 0.034, 1638, 0.55, 0.0872],
        [0.52, 0.087, 1695, 1.35, 0.0561],
        [0.545, 0.1, 1543, 1.46, 0.0109],
      ]),
    ],
    // The same riffle with other pages: grains a little apart and a firmer first thump.
    [
      hiss(0, 1194, 2.99, 0.00199),
      ...crackles([
        [0.028, 0.1, 1652, 1.34, 0.0121],
        [0.094, 0.1, 2178, 2.89, 0.0187],
        [0.118, 0.1, 2149, 1.2, 0.0159],
        [0.159, 0.062, 2262, 1.97, 0.0243],
        [0.175, 0.035, 1396, 0.89, 0.0513],
        [0.19, 0.057, 1284, 0.79, 0.0379],
        [0.214, 0.065, 1737, 1.1, 0.0289],
        [0.233, 0.1, 2102, 0.6, 0.0106],
        [0.274, 0.1, 3050, 1.33, 0.0109],
        [0.309, 0.1, 2090, 0.64, 0.01],
        [0.341, 0.1, 983, 0.88, 0.0179],
        [0.358, 0.078, 303, 0.78, 0.184],
        [0.37, 0.091, 2505, 1.54, 0.0272],
        [0.397, 0.1, 754, 0.61, 0.0286],
        [0.43, 0.083, 1761, 1.14, 0.0514],
        [0.441, 0.082, 197, 0.55, 0.02],
        [0.46, 0.094, 756, 1.42, 0.0661],
        [0.504, 0.042, 121, 0.8, 0.0946],
        [0.508, 0.058, 1321, 0.73, 0.103],
        [0.529, 0.061, 2055, 1.7, 0.0598],
        [0.544, 0.1, 1446, 1.22, 0.0115],
      ]),
    ],
  ],
  // A cover that shuts: a faint rustle, a lighter hit, then the thud (low noise, two falling rings
  // and a snap of air on the transient) and a low ring that dies by 0.3 s.
  bookClose: [
    [
      ...crackles([
        [0, 0.1, 439, 0.35, 0.0126],
        [0.085, 0.1, 136, 0.22, 0.038],
        [0.096, 0.095, 151, 0.23, 0.2],
      ]),
      ring(0.105, 0.122, 160, 65, 0.082, 0.19),
      ...crackles([
        [0.108, 0.1, 178, 1.01, 0.2],
        [0.119, 0.1, 1430, 1.64, 0.2],
        [0.127, 0.031, 99, 0.36, 0.2],
      ]),
      ring(0.128, 0.164, 341, 218, 0.043, 0.2),
      hiss(0.128, 5741, 1.15, 0.137, 0.011),
      ring(0.156, 0.222, 87, 71, 0.17, 0.0378),
    ],
  ],
};

/** Length of a variant (s): when its last part ends. */
export function soundLength(parts: SoundPart[]): number {
  return parts.reduce((end, part) => Math.max(end, part.at + part.duration), 0);
}
