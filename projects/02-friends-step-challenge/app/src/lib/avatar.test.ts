import { describe, expect, it } from 'vitest';
import { getAvatarUrl, getProfilePhotoURL } from './avatar';

describe('photo avatars', () => {
  const character = { seed: 'walker', style: 'sprouts' as const };
  it('uses a real photo for both SVG and PNG callers', () => {
    const avatar = { ...character, photoURL: 'https://example.com/photo.jpg' };
    expect(getAvatarUrl(avatar)).toBe(avatar.photoURL);
    expect(getAvatarUrl(avatar, 'png')).toBe(avatar.photoURL);
  });
  it('keeps generated characters and rejects unsafe photo URLs', () => {
    expect(getProfilePhotoURL(getAvatarUrl(character))).toBeUndefined();
    for (const photoURL of ['file:///photo.jpg', 'javascript:alert(1)', 'https://user:password@example.com/photo', 'not a URL']) {
      expect(getProfilePhotoURL(photoURL)).toBeUndefined();
      expect(getAvatarUrl({ ...character, photoURL })).toBe(getAvatarUrl(character));
    }
  });
});
