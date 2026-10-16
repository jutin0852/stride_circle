import type { User } from 'firebase/auth';

import { updateUserAvatar } from '@/lib/auth';
import { type AvatarChoice } from '@/lib/avatar';
import { type MediaStorage, type ProfilePhoto } from '@/domain/media-storage';
import { createHttpMediaStorage } from '@/services/media/http-media-storage';

export type { ProfilePhoto } from '@/domain/media-storage';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function validateProfilePhoto(photo: ProfilePhoto) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType)) {
    throw new Error('Choose a JPG, PNG or WebP photo.');
  }
  const base64 = photo.base64;
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('This photo could not be read. Please choose it again.');
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  if (base64.length * 3 / 4 - padding > MAX_PHOTO_BYTES) throw new Error('Choose a photo smaller than 5 MB.');
}

type SavePhotoInput = { photo: ProfilePhoto; avatar: AvatarChoice; user: User };

export function createProfilePhotoSaver(dependencies: {
  storage: MediaStorage;
  saveAvatar: typeof updateUserAvatar;
}) {
  return async (input: SavePhotoInput) => {
    validateProfilePhoto(input.photo);
    const asset = await dependencies.storage.uploadProfilePhoto(input.photo, input.user.uid);
    try {
      await dependencies.saveAvatar({ user: input.user, avatar: { ...input.avatar, photoURL: asset.url, photoAsset: asset } });
    } catch (error) {
      await dependencies.storage.deleteAsset(asset, input.user.uid).catch(() => {});
      throw error;
    }
    // Never infer ownership from a URL or delete an external Google/legacy photo.
    const previous = input.avatar.photoAsset;
    if (previous && previous.ownerId === input.user.uid && previous.id !== asset.id) {
      await dependencies.storage.deleteAsset(previous, input.user.uid).catch(() => {});
    }
  };
}

export async function saveProfilePhoto(input: SavePhotoInput) {
  const storage = createHttpMediaStorage({
    baseUrl: process.env.EXPO_PUBLIC_MEDIA_API_URL,
    getAccessToken: () => input.user.getIdToken(),
  });
  return createProfilePhotoSaver({ storage, saveAvatar: updateUserAvatar })(input);
}

export function getProfilePhotoError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.startsWith('storage/') || code.startsWith('firestore/') || code === 'permission-denied') {
    return 'Your photo could not be saved. Check your connection and try again.';
  }
  if (error instanceof Error && ['Choose a JPG, PNG or WebP photo.', 'Choose a photo smaller than 5 MB.', 'This photo could not be read. Please choose it again.'].includes(error.message)) return error.message;
  if (error instanceof Error && error.message === 'Please update the app to save a profile photo.') return error.message;
  return 'Your photo could not be saved. Please try again.';
}
