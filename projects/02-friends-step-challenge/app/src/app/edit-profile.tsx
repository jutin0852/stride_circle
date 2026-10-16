import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText, Button, FixedHeaderScreen } from '@/components/ui';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage, updateUserAvatar, updateUserDisplayName } from '@/lib/auth';
import { isAvatarStyle } from '@/lib/avatar';
import { useAppColors } from '@/design-system/use-app-theme';
import { getProfilePhotoError, saveProfilePhoto } from '@/services/profile-photo';
import { prepareProfilePhoto, type SelectedProfilePhoto } from '@/services/profile-photo-preparation';
import { ProfilePhotoCrop, ProfilePhotoPreview } from '@/features/profile/profile-photo-crop';
import { getPhotoCrop } from '@/domain/photo-crop';

export default function EditProfileRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const displayName = profile.displayName;
  const avatar = profile.avatar;
  const { characterStyle } = useLocalSearchParams<{ characterStyle?: string }>();
  const character = isAvatarStyle(characterStyle) ? { seed: avatar.seed, style: characterStyle } : null;
  const [draftName, setDraftName] = useState<string | null>(null);
  const name = draftName ?? displayName;
  const [pendingPhoto, setPhoto] = useState<SelectedProfilePhoto | null>(null);
  const [cropCandidate, setCropCandidate] = useState<SelectedProfilePhoto | null>(null);
  const photo = character ? null : pendingPhoto;
  const [isPicking, setIsPicking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const busy = useRef(false);
  const pickerRef = useRef<typeof import('expo-image-picker') | null>(null);
  // Warm the JS module before the tap; never request broad library access here.
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      pickerRef.current = require('expo-image-picker');
    } catch { /* Older clients can still edit their name and character. */ }
  }, []);
  const characterChanged = !!character && (!!avatar.photoURL || character.style !== avatar.style);
  const hasChanges = !!photo || characterChanged || name.trim() !== displayName;

  async function choosePhoto() {
    if (busy.current) return;
    busy.current = true;
    setIsPicking(true);
    try {
      // Keep older development clients usable when the native picker is absent.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const picker = pickerRef.current ?? require('expo-image-picker') as typeof import('expo-image-picker');
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: false,
        preferredAssetRepresentationMode: picker.UIImagePickerPreferredAssetRepresentationMode.Current,
        quality: 1, base64: false, exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) throw new Error('This photo could not be read. Please choose it again.');
      // Validate dimensions after selection, without importing the native processor.
      getPhotoCrop(asset.width, asset.height);
      setCropCandidate({ uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType });
    } catch {
      Alert.alert('Could not select photo', 'Please try choosing the photo again. If Photos did not open, check the app’s photo permission in Settings.');
    } finally { busy.current = false; setIsPicking(false); }
  }

  async function handleSave() {
    if (!user || busy.current || !hasChanges || !name.trim()) return;
    busy.current = true;
    setIsSaving(true);
    try {
      if (name.trim() !== displayName) await updateUserDisplayName({ displayName: name, user });
      if (photo) await saveProfilePhoto({ photo: await prepareProfilePhoto(photo), avatar, user });
      else if (characterChanged && character) await updateUserAvatar({ avatar: character, user });
      Alert.alert('Profile saved', 'Your profile has been updated.');
      router.back();
    } catch (error) {
      Alert.alert('Could not update profile', photo ? getProfilePhotoError(error) : getAuthErrorMessage(error));
    } finally {
      setIsSaving(false);
      busy.current = false;
    }
  }

  return (
    <>
    {cropCandidate ? <ProfilePhotoCrop key={cropCandidate.uri} photo={cropCandidate} onCancel={() => setCropCandidate(null)} onConfirm={crop => { setPhoto({ ...cropCandidate, crop }); setCropCandidate(null); router.setParams({ characterStyle: '' }); }} /> : null}
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<View style={styles.fixedCopy}>
        <View style={[styles.nav, { marginHorizontal: -4, marginVertical: -4, padding: 4 }]}><Pressable accessibilityLabel="Go back" accessibilityRole="button" disabled={isSaving || isPicking} hitSlop={4} onPress={() => router.back()} style={styles.roundButton}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable></View>
        <AppText style={styles.eyebrow}>PROFILE</AppText>
        <AppText accessibilityRole="header" style={styles.title}>Edit profile</AppText>
      </View>}
      headerStyle={styles.fixedHeader}
      scrollViewProps={{ contentInsetAdjustmentBehavior: 'never', testID: 'edit-profile-form' }}
    >
      <AppText style={styles.sectionTitle}>Profile picture</AppText>
      <View style={styles.photoCard}>
        {photo ? <ProfilePhotoPreview photo={photo} size={96} label="Selected profile picture" /> : <DicebearAvatar choice={character ?? avatar} fallback={getInitials(displayName)} size={96} />}
        <Pressable accessibilityRole="button" disabled={isSaving || isPicking} onPress={() => void choosePhoto()} style={styles.photoAction}>
          {isPicking ? <ActivityIndicator color={colors.accentPressed} /> : <Ionicons color={colors.accentPressed} name="camera-outline" size={20} />}
          <AppText style={styles.photoActionText}>{isPicking ? 'Opening photos…' : photo || (!character && avatar.photoURL) ? 'Change photo' : 'Add photo'}</AppText>
        </Pressable>
        {photo || characterChanged ? <AppText accessibilityLiveRegion="polite" style={styles.characterCaption}>Ready to save</AppText> : null}
      </View>
      <PressableScale accessibilityLabel="Choose a character" accessibilityHint="Browse characters. Your picture stays unchanged until you choose one and save." accessibilityRole="button" disabled={isSaving || isPicking} onPress={() => router.push({ pathname: '/profile-character', params: { returnTo: 'edit-profile' } })} style={[styles.characterCard]}>
        <View style={styles.characterCopy}><AppText style={styles.characterCaption}>Or choose a character</AppText></View><Ionicons color={colors.muted} name="chevron-forward" size={21} />
      </PressableScale>

      <AppText style={styles.sectionTitle}>Your name</AppText>
      <View style={styles.nameCard}><AppText style={styles.fieldLabel}>DISPLAY NAME</AppText><TextInput accessibilityLabel="Display name" autoCapitalize="words" editable={!isSaving} maxLength={40} onChangeText={setDraftName} style={styles.input} value={name} /></View>

      <Button accessibilityLabel={isSaving ? 'Saving profile' : 'Save changes'} disabled={isPicking || !hasChanges || !name.trim()} loading={isSaving} onPress={() => void handleSave()} style={{ marginTop: 10 }}>Save changes</Button>
    </FixedHeaderScreen>
    </>
  );
}

function getInitials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC'; }

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  photoCard: { alignItems: 'center', gap: 12, paddingVertical: 16 }, photoPreview: { width: 96, height: 96, borderRadius: 48 }, photoAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 }, photoActionText: { color: colors.accentPressed, fontSize: 16, fontWeight: '700' },
  fixedHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 }, fixedCopy: { gap: 14 }, content: { gap: 14, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 }, nav: { flexDirection: 'row' }, roundButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 32, lineHeight: 40, fontWeight: '800', letterSpacing: -1.1 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 10 },
  characterCard: { alignItems: 'center', backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 20, borderWidth: 2, flexDirection: 'row', padding: 16 }, characterCopy: { flex: 1, marginLeft: 13 }, characterCaption: { color: colors.muted, fontSize: 13, lineHeight: 18 }, nameCard: { backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 18, borderWidth: 2, gap: 7, padding: 17 }, fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 51, paddingHorizontal: 14 },
}); }
