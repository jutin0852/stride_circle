import { Platform, Share, type View } from 'react-native';
import type { RefObject } from 'react';
import type { SharedWalk } from '@/features/walks/share-card';
import { formatWalkTime } from '@/domain/walk';

export async function shareWalkImage(ref: RefObject<View | null>, walk: SharedWalk, story: boolean) {
  if (Platform.OS === 'web') {
    await Share.share({ message: `${walk.title} · ${(walk.distanceMeters / 1000).toFixed(2)} km · ${formatWalkTime(walk.durationSeconds)} · Stride Circle` });
    return;
  }
  const { captureRef, releaseCapture } = await import('react-native-view-shot');
  const sharing = await import('expo-sharing');
  if (!await sharing.isAvailableAsync()) throw new Error('Image sharing is unavailable on this device.');
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: story ? 1920 : 1080 });
  try { await sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your walk' }); }
  finally { releaseCapture(uri); }
}
