import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage, updateUserDisplayName } from '@/lib/auth';
import { colors } from '@/theme';

export default function EditProfileRoute() {
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const displayName = profile.displayName;
  const avatar = profile.avatar;
  const [draftName, setDraftName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateUserDisplayName({ displayName: draftName, user });
      router.back();
    } catch (error) {
      Alert.alert('Could not update profile', getAuthErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.nav}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.roundButton}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable></View>
      <Text style={styles.eyebrow}>PROFILE</Text>
      <Text style={styles.title}>Edit profile</Text>

      <Text style={styles.sectionTitle}>Your character</Text>
      <Pressable accessibilityHint="Opens the character picker" accessibilityRole="button" onPress={() => router.push('/profile-character')} style={({ pressed }) => [styles.characterCard, pressed && styles.pressed]}>
        <DicebearAvatar choice={avatar} fallback={getInitials(displayName)} size={70} />
        <View style={styles.characterCopy}><Text style={styles.characterCaption}>Choose a character that feels like you.</Text></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={21} />
      </Pressable>

      <Text style={styles.sectionTitle}>Your name</Text>
      <View style={styles.nameCard}><Text style={styles.fieldLabel}>DISPLAY NAME</Text><TextInput accessibilityLabel="Display name" autoCapitalize="words" maxLength={40} onChangeText={setDraftName} style={styles.input} value={draftName} /></View>

      <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void handleSave()} style={({ pressed }) => [styles.saveButton, isSaving && styles.disabled, pressed && !isSaving && styles.pressed]}>
        {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save changes</Text>}
      </Pressable>
    </ScrollView>
  );
}

function getInitials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 40 }, nav: { flexDirection: 'row' }, roundButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1.1 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 10 },
  characterCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: 'row', padding: 16 }, characterCopy: { flex: 1, marginLeft: 13 }, characterCaption: { color: colors.muted, fontSize: 13, lineHeight: 18 }, nameCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: 7, padding: 17 }, fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 51, paddingHorizontal: 14 }, saveButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, justifyContent: 'center', marginTop: 10, minHeight: 55 }, saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.6 }, pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
