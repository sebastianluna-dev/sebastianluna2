import { describe, expect, it } from 'vitest';
import { AVATAR_IMAGE, PROFILE, avatarWidths } from './profile';

describe('avatar', () => {
  it('is a square source large enough for the 60 px home avatar at 3x', () => {
    expect(PROFILE.avatar.width).toBe(PROFILE.avatar.height);
    expect(PROFILE.avatar.width).toBeGreaterThanOrEqual(60 * 3);
  });

  it('asks only for the 1x/2x/3x of what is drawn', () => {
    expect(avatarWidths(60)).toEqual([60, 120, 180]);
    // ChatAside: 28 px, 24 on phones.
    expect(avatarWidths(28, 24)).toEqual([24, 28, 48, 56, 72, 84]);
  });

  it('never upscales past the source', () => {
    expect(Math.max(...avatarWidths(200))).toBeLessThanOrEqual(PROFILE.avatar.width);
  });

  it('serves AVIF with a WebP fallback', () => {
    expect(AVATAR_IMAGE.formats).toEqual(['avif', 'webp']);
  });
});
