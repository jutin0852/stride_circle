import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { AppText, FixedHeaderScreen, IconButton, StateCard } from '@/components/ui';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { UsernameForm } from '@/features/people/username-form';
import { usePublicProfile } from '@/hooks/use-people';

export default function UsernameRoute() {
  const colors = useAppColors();
  const { user } = useAuth();
  const profile = usePublicProfile(user?.uid);

  return (
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
        <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">{profile.value ? 'Your username' : 'Pick a username'}</AppText>
        <View style={styles.spacer} />
      </View>}
      headerStyle={styles.headerContainer}
    >
      <AppText tone="secondary" variant="bodySmall">Friends can search for your username to add you to a circle or send a friend request, instead of sharing a code.</AppText>
      {!user || profile.status === 'loading' ? <StateCard description="Loading your profile." title="Loading" /> : null}
      {user && profile.status === 'error' ? <StateCard description="Your profile could not load. Check your connection and try again." title="Profile unavailable" tone="error" /> : null}
      {user && profile.status === 'ready' ? <UsernameForm onSaved={() => router.back()} profile={profile.value} user={user} /> : null}
    </FixedHeaderScreen>
  );
}

const styles = StyleSheet.create({
  headerContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  title: { flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  content: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.xxxl },
});
