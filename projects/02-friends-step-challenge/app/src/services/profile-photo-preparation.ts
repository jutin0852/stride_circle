import type { ProfilePhoto } from '@/domain/media-storage';
import { validateProfilePhoto } from '@/services/profile-photo';
import type { PhotoCrop } from '@/domain/photo-crop';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type SelectedProfilePhoto = { uri: string; width: number; height: number; mimeType?: string | null; crop?: PhotoCrop };
const MAX_PROFILE_EDGE = 1024;

/** Bound decoded/uploaded size without enlarging small photos or changing their ratio. */
export function getProfilePhotoSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('This photo could not be read. Please choose it again.');
  }
  const scale = Math.min(1, MAX_PROFILE_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Runs only after Save: never decode full-resolution base64 just to open Photos. */
export async function prepareProfilePhoto(photo: SelectedProfilePhoto): Promise<ProfilePhoto> {
  const size = getProfilePhotoSize(photo.crop?.width ?? photo.width, photo.crop?.height ?? photo.height);
  let processor: typeof import('expo-image-manipulator');
  try {
    if (Platform.OS !== 'web' && !requireOptionalNativeModule('ExpoImageManipulator')) {
      throw new Error('Missing native photo processor.');
    }
    // Keep older clients usable for character/name edits until they are rebuilt.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    processor = require('expo-image-manipulator');
  } catch {
    throw new Error('Please update the app to save a profile photo.');
  }
  const context = processor.ImageManipulator.manipulate(photo.uri);
  let image: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
  try {
    if (photo.crop) context.crop(photo.crop);
    if (size.width !== (photo.crop?.width ?? photo.width) || size.height !== (photo.crop?.height ?? photo.height)) context.resize(size);
    image = await context.renderAsync();
    // PNG preserves transparency; other device-supported formats become a portable JPEG.
    const png = photo.mimeType === 'image/png';
    const result = await image.saveAsync({ format: png ? processor.SaveFormat.PNG : processor.SaveFormat.JPEG, compress: png ? 1 : 0.9, base64: true });
    const prepared = { uri: result.uri, base64: result.base64 ?? '', mimeType: png ? 'image/png' : 'image/jpeg' };
    validateProfilePhoto(prepared);
    return prepared;
  } finally {
    image?.release();
    context.release();
  }
}
