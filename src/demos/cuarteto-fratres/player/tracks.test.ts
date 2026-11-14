import { describe, expect, it } from 'vitest';
import { AUDIO_BASE, FILTERS, TRACKS, audioUrl, categoryLabel } from './tracks';

describe('audioUrl', () => {
  it('encodes the whole file name as one path segment', () => {
    expect(audioUrl({ file: 'A b, c (d).mp3' })).toBe(`${AUDIO_BASE}A%20b%2C%20c%20(d).mp3`);
  });

  it('encodes accents', () => {
    expect(audioUrl({ file: 'Otoño José.mp3' })).toBe(`${AUDIO_BASE}Oto%C3%B1o%20Jos%C3%A9.mp3`);
  });
});

describe('the programme', () => {
  it('has the eight works, each with a category the chips know', () => {
    expect(TRACKS).toHaveLength(8);
    for (const track of TRACKS) expect(categoryLabel(track.categoryId)).not.toBe('');
  });

  it('reads the chips in the site order', () => {
    expect(FILTERS.map((filter) => filter.label)).toEqual([
      'Todo',
      'Cámara',
      'Latinoamericana',
      'Bodas',
      'Pop',
    ]);
  });

  it('shows the long label under the record', () => {
    expect(categoryLabel('latam')).toBe('Mexicana y latinoamericana');
  });
});
