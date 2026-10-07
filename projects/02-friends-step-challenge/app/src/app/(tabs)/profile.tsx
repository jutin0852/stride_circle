import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText } from '@/components/ui';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage, signOutCurrentUser } from '@/lib/auth';
import { colors } from '@/theme';

export default function ProfileRoute() {
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const displayName = profile.displayName;
  const avatar = profile.avatar;

  async function handleSignOut() {
    try {
      await signOutCurrentUser();
    } catch (error) {
      Alert.alert('Could not sign out', getAuthErrorMessage(error));
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <AppText style={styles.eyebrow}>YOUR PROFILE</AppText>
      <AppText style={styles.title}>{displayName}</AppText>

      <Pressable
        accessibilityHint="Opens profile editing"
        accessibilityRole="button"
        onPress={() => router.push('/edit-profile')}
        style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
      >
        <DicebearAvatar choice={avatar} fallback={getInitials(displayName)} size={78} />
        <View style={styles.profileText}>
          <AppText style={styles.profileTitle}>{displayName}</AppText>
          <AppText style={styles.profileCaption}>Tap to edit your profile</AppText>
        </View>
        <View style={styles.editIcon}><Ionicons color={colors.accentPressed} name="pencil" size={17} /></View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
        <AppText style={styles.signOutText}>Sign out</AppText>
      </Pressable>
    </ScrollView>
  );
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC';
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 },
  profileCard: { alignItems: 'center', backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 22, borderWidth: 2, flexDirection: 'row', marginTop: 8, padding: 18 }, profileText: { flex: 1, gap: 4, marginLeft: 14 }, profileTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, profileCaption: { color: colors.muted, fontSize: 13 }, editIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  signOut: { alignItems: 'center', borderBottomWidth: 2, borderColor: colors.border, borderRadius: 15, borderWidth: 1, marginTop: 6, paddingVertical: 14 }, signOutText: { color: colors.accentPressed, fontSize: 15, fontWeight: '800' }, pressed: { opacity: 0.84, transform: [{ translateY: 2 }] },
});
