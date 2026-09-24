import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
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
      <Text style={styles.eyebrow}>YOUR PROFILE</Text>
      <Text style={styles.title}>{displayName}</Text>

      <Pressable
        accessibilityHint="Opens profile editing"
        accessibilityRole="button"
        onPress={() => router.push('/edit-profile')}
        style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
      >
        <DicebearAvatar choice={avatar} fallback={getInitials(displayName)} size={78} />
        <View style={styles.profileText}>
          <Text style={styles.profileTitle}>{displayName}</Text>
          <Text style={styles.profileCaption}>Tap to edit your profile</Text>
        </View>
        <View style={styles.editIcon}><Ionicons color={colors.accentPressed} name="pencil" size={17} /></View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC';
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 },
  profileCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', marginTop: 8, padding: 18 }, profileText: { flex: 1, gap: 4, marginLeft: 14 }, profileTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, profileCaption: { color: colors.muted, fontSize: 13 }, editIcon: { alignItems: 'center', backgroundColor: '#EAF0FF', borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  signOut: { alignItems: 'center', borderColor: '#BFD0FF', borderRadius: 15, borderWidth: 1, marginTop: 6, paddingVertical: 14 }, signOutText: { color: colors.accentPressed, fontSize: 15, fontWeight: '800' }, pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
