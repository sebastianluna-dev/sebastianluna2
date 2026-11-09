import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUNDS, SOUND_CHANNEL } from './recipes';
import { SAMPLES, SAMPLE_LATE_MS, SAMPLE_RATE, isSample, playsWhenLoaded } from './samples';

const BOOKS = new URL('../../assets/sounds/books/', import.meta.url);

/** Sample rate of an MPEG-1 Layer III file, read from its first frame header (after any ID3v2 tag). */
function mp3Rate(bytes: Uint8Array): number {
  let at = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    at = 10 + (((bytes[6]! << 21) | (bytes[7]! << 14) | (bytes[8]! << 7) | bytes[9]!) >>> 0);
  }
  while (at < bytes.length - 3 && !(bytes[at] === 0xff && (bytes[at + 1]! & 0xe0) === 0xe0)) at += 1;
  const mpeg1 = (bytes[at + 1]! & 0x18) === 0x18;
  const index = (bytes[at + 2]! >> 2) & 0x3;
  return mpeg1 ? ([44100, 48000, 32000][index] ?? 0) : 0;
}

describe('recorded sounds', () => {
  it('plays the slow page turn (option 4) when a book opens and when it closes', () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(['bookClose', 'bookOpen']);
    expect(SAMPLES.bookOpen.url).toContain('page-turn-slow');
    expect(SAMPLES.bookClose.url).toBe(SAMPLES.bookOpen.url);
  });

  it('keeps the gain below the file level, near the level it was chosen at', () => {
    for (const sample of Object.values(SAMPLES)) {
      expect(sample.gain).toBeGreaterThan(0);
      expect(sample.gain).toBeLessThanOrEqual(1);
    }
  });

  it('never names a sound both a recipe and a recording, and keeps the books on one channel', () => {
    for (const name of Object.keys(SAMPLES)) expect(Object.hasOwn(SOUNDS, name)).toBe(false);
    expect(isSample('bookOpen')).toBe(true);
    expect(isSample('droid')).toBe(false);
    expect(isSample('toString')).toBe(false);
    expect(SOUND_CHANNEL.bookOpen).toBe('book');
    expect(SOUND_CHANNEL.bookClose).toBe('book');
  });

  it('keeps the eight CC0 recordings Sebastian chose from, with their license', () => {
    // Dotfiles (a .DS_Store Finder leaves) are not part of the set.
    expect(readdirSync(BOOKS).filter((file) => !file.startsWith('.')).sort()).toEqual([
      'LICENSE.txt',
      'README.md',
      'book-close.mp3',
      'book-open.mp3',
      'book-place-1.mp3',
      'book-place-2.mp3',
      'book-place-3.mp3',
      'page-turn-quick.mp3',
      'page-turn-slow.mp3',
      'pages-riffle.mp3',
    ]);
  });

  it('decodes at the rate every recording is encoded at', () => {
    for (const file of readdirSync(BOOKS).filter((name) => name.endsWith('.mp3'))) {
      expect(mp3Rate(new Uint8Array(readFileSync(new URL(file, BOOKS)))), file).toBe(SAMPLE_RATE);
    }
  });

  it('plays a recording that loaded in time and is still the latest of its channel', () => {
    expect(playsWhenLoaded(1000, 1000, true)).toBe(true);
    expect(playsWhenLoaded(1000, 1000 + SAMPLE_LATE_MS, true)).toBe(true);
    expect(playsWhenLoaded(1000, 1001 + SAMPLE_LATE_MS, true)).toBe(false);
    expect(playsWhenLoaded(1000, 1010, false)).toBe(false);
  });
});
