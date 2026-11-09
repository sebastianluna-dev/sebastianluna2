import { describe, expect, it } from 'vitest';
import {
  CHANNEL_CUT,
  NOISE_LENGTH,
  SOUNDS,
  SOUND_ATTACK,
  SOUND_CHANNEL,
  soundLength,
  type RecipeName,
} from './recipes';

const names = Object.keys(SOUNDS) as RecipeName[];

describe('interface sounds', () => {
  it('synthesises every sound but the books (recorded, samples.ts), droid in three variants', () => {
    expect(names.sort()).toEqual(['closeChat', 'droid', 'openChat', 'theme', 'typing']);
    expect(SOUNDS.droid).toHaveLength(3);
  });

  it('puts only the two book sounds on one channel, so a new one cuts the previous', () => {
    expect(SOUND_CHANNEL).toEqual({ bookOpen: 'book', bookClose: 'book' });
    expect(CHANNEL_CUT).toBeGreaterThan(0);
    expect(CHANNEL_CUT).toBeLessThanOrEqual(0.01);
  });

  it('keeps every noise part within the shared noise buffer, or it would go silent', () => {
    for (const name of names) {
      for (const part of SOUNDS[name].flat()) {
        if (part.kind === 'noise') expect(part.duration).toBeLessThanOrEqual(NOISE_LENGTH);
      }
    }
  });

  it('keeps every sound short, as the reference (all under 0.65 s)', () => {
    for (const name of names) {
      for (const variant of SOUNDS[name]) expect(soundLength(variant)).toBeLessThan(0.65);
    }
  });

  it('keeps every part audible, quiet and longer than its attack', () => {
    for (const name of names) {
      for (const part of SOUNDS[name].flat()) {
        expect(part.at).toBeGreaterThanOrEqual(0);
        expect(part.duration).toBeGreaterThan(SOUND_ATTACK);
        expect(part.gain).toBeGreaterThan(0);
        expect(part.gain).toBeLessThanOrEqual(0.2);
        if (part.kind === 'tone') {
          expect(Math.min(part.from, part.to)).toBeGreaterThanOrEqual(60);
          expect(Math.max(part.from, part.to)).toBeLessThanOrEqual(12000);
          expect(part.glide).toBeLessThanOrEqual(part.duration);
        } else {
          expect(part.frequency).toBeGreaterThanOrEqual(60);
          expect(part.frequency).toBeLessThanOrEqual(12000);
        }
      }
    }
  });
});
