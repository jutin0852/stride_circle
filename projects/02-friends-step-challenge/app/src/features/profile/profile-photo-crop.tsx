import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import type { SelectedProfilePhoto } from '@/services/profile-photo-preparation';
import { clamp, getPhotoCrop, type PhotoCrop } from '@/domain/photo-crop';

export function ProfilePhotoPreview({ photo, size, label }: { photo: SelectedProfilePhoto; size: number; label: string }) {
  const crop = photo.crop ?? getPhotoCrop(photo.width, photo.height);
  const scale = size / crop.width;
  return <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
    <Image accessibilityLabel={label} source={{ uri: photo.uri }} style={{ position: 'absolute', width: photo.width * scale, height: photo.height * scale, left: -crop.originX * scale, top: -crop.originY * scale }} />
  </View>;
}

export function ProfilePhotoCrop({ photo, onCancel, onConfirm }: { photo: SelectedProfilePhoto; onCancel: () => void; onConfirm: (crop: PhotoCrop) => void }) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const size = Math.max(96, Math.min(window.width - 48, window.height * 0.45, 360));
  const [position, setPosition] = useState({ x: 0.5, y: 0.5, zoom: 1, startX: 0.5, startY: 0.5 });
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const crop = getPhotoCrop(photo.width, photo.height, position.zoom, position.x, position.y);
  const scale = size / crop.width;
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => setPosition(current => ({ ...current, startX: current.x, startY: current.y })),
    onPanResponderMove: (_, gesture) => {
      const spanX = (photo.width - crop.width) * scale;
      const spanY = (photo.height - crop.height) * scale;
      setPosition(current => ({ ...current, x: spanX ? clamp(current.startX - gesture.dx / spanX, 0, 1) : 0.5, y: spanY ? clamp(current.startY - gesture.dy / spanY, 0, 1) : 0.5 }));
    },
  }), [photo.width, photo.height, crop.width, crop.height, scale]);
  const adjustZoom = (amount: number) => setPosition(current => ({ ...current, zoom: clamp(current.zoom + amount, 1, 3) }));
  return <Modal visible animationType="none" onRequestClose={onCancel} presentationStyle="fullScreen">
    <ScrollView accessibilityViewIsModal contentContainerStyle={[styles.content, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} style={{ backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      <AppText accessibilityRole="header" style={styles.title}>Adjust photo</AppText>
      <AppText tone="secondary">Drag to position your photo. Use + or − to zoom.</AppText>
      <View {...pan.panHandlers} accessible accessibilityLabel="Photo crop position" accessibilityHint="Use actions to move the photo within the frame" accessibilityActions={[{ name: 'left', label: 'Move crop left' }, { name: 'right', label: 'Move crop right' }, { name: 'up', label: 'Move crop up' }, { name: 'down', label: 'Move crop down' }]} onAccessibilityAction={({ nativeEvent }) => setPosition(current => ({ ...current, x: clamp(current.x + (nativeEvent.actionName === 'right' ? 0.1 : nativeEvent.actionName === 'left' ? -0.1 : 0), 0, 1), y: clamp(current.y + (nativeEvent.actionName === 'down' ? 0.1 : nativeEvent.actionName === 'up' ? -0.1 : 0), 0, 1) }))} style={{ width: size, height: size, overflow: 'hidden', backgroundColor: colors.soft, alignSelf: 'center' }}>
        <Image testID="profile-photo-crop-image" accessible={false} onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('error')} source={{ uri: photo.uri }} style={{ position: 'absolute', width: photo.width * scale, height: photo.height * scale, left: -crop.originX * scale, top: -crop.originY * scale }} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 2, borderColor: colors.accent }]} />
        {imageStatus === 'loading' ? <ActivityIndicator accessibilityLabel="Loading selected photo" style={StyleSheet.absoluteFill} color={colors.accent} /> : null}
      </View>
      {imageStatus === 'error' ? <AppText tone="danger">This photo could not be opened. Cancel and choose another photo.</AppText> : null}
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom out" disabled={position.zoom <= 1} onPress={() => adjustZoom(-0.25)} style={[styles.iconButton, position.zoom <= 1 && { opacity: 0.4 }]}><Ionicons name="remove" size={24} color={colors.ink} /></Pressable>
        <AppText accessibilityRole="adjustable" accessibilityLabel="Photo zoom" accessibilityValue={{ min: 100, max: 300, now: Math.round(position.zoom * 100) }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={({ nativeEvent }) => adjustZoom(nativeEvent.actionName === 'increment' ? 0.25 : -0.25)}>{Math.round(position.zoom * 100)}%</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Zoom in" disabled={position.zoom >= 3} onPress={() => adjustZoom(0.25)} style={[styles.iconButton, position.zoom >= 3 && { opacity: 0.4 }]}><Ionicons name="add" size={24} color={colors.ink} /></Pressable>
        <Button variant="tertiary" onPress={() => setPosition({ x: 0.5, y: 0.5, zoom: 1, startX: 0.5, startY: 0.5 })}>Reset</Button>
      </View>
      <Button disabled={imageStatus !== 'ready'} onPress={() => onConfirm(crop)}>Use photo</Button>
      <Button variant="tertiary" onPress={onCancel}>Cancel</Button>
    </ScrollView>
  </Modal>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 20, paddingHorizontal: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
