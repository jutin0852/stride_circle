import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText, FixedHeaderScreen } from '@/components/ui';
import { usePublicProfile } from '@/hooks/use-people';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage, signOutCurrentUser } from '@/lib/auth';
import { restartOnboardingForTesting } from '@/lib/onboarding';
import { useAppColors } from '@/design-system/use-app-theme';

export default function ProfileRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const publicProfile = usePublicProfile(user?.uid);
  const displayName = profile.displayName;
  const avatar = profile.avatar;

  async function handleSignOut() {
    try {
      await signOutCurrentUser();
    } catch (error) {
      Alert.alert('Could not sign out', getAuthErrorMessage(error));
    }
  }

  function handleReplayOnboarding() {
    if (!user) return;
    Alert.alert(
      'Replay onboarding?',
      'This keeps your account and data. It only reopens the setup flow for testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replay',
          onPress: () => void restartOnboardingForTesting(user.uid)
            .then(() => router.replace('/onboarding'))
            .catch((error) => Alert.alert('Could not reopen onboarding', getAuthErrorMessage(error))),
        },
      ],
    );
  }

  function handleReplaySplash() {
    Alert.alert('Replay splash screen', 'Choose the launch animation to preview. Your normal launch schedule stays the same.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Full animation', onPress: () => router.push({ pathname: '/splash-preview', params: { mode: 'full' } }) },
      { text: 'Quick animation', onPress: () => router.push({ pathname: '/splash-preview', params: { mode: 'short' } }) },
    ]);
  }

  return (
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<View testID="profile-fixed-header" style={styles.header}><AppText style={styles.eyebrow}>YOUR PROFILE</AppText><AppText style={styles.title}>{displayName}</AppText></View>}
      headerStyle={styles.headerContainer}
      scrollViewProps={{ contentInsetAdjustmentBehavior: 'never' }}
    >
      <PressableScale
        accessibilityHint="Opens profile editing"
        accessibilityRole="button"
        onPress={() => router.push('/edit-profile')}
        style={[styles.profileCard]}
      >
        <DicebearAvatar choice={avatar} fallback={getInitials(displayName)} size={78} />
        <View style={styles.profileText}>
          <AppText style={styles.profileTitle}>{displayName}</AppText>
          <AppText style={styles.profileCaption}>Tap to edit your profile</AppText>
        </View>
        <View style={styles.editIcon}><Ionicons color={colors.accentPressed} name="pencil" size={17} /></View>
      </PressableScale>

      <PressableScale accessibilityRole="button" accessibilityLabel="Username" onPress={() => router.push('/username')} style={[styles.reminderCard]}>
        <Ionicons color={colors.accentPressed} name="at-outline" size={24} />
        <View style={styles.profileText}><AppText style={styles.profileTitle}>{publicProfile.value ? '@' + publicProfile.value.username : 'Pick a username'}</AppText><AppText style={styles.profileCaption}>{publicProfile.value ? 'Friends find you with this. Change it or hide from search.' : 'So friends can find you and add you to circles.'}</AppText></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </PressableScale>

      <PressableScale accessibilityRole="button" accessibilityLabel="Find people" onPress={() => router.push('/people')} style={[styles.reminderCard]}>
        <Ionicons color={colors.accentPressed} name="people-outline" size={24} />
        <View style={styles.profileText}><AppText style={styles.profileTitle}>Find people</AppText><AppText style={styles.profileCaption}>Search for friends and invite them to your circles.</AppText></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </PressableScale>

      <PressableScale accessibilityRole="button" accessibilityLabel="Walking reminders" onPress={() => router.push('/walking-reminders')} style={[styles.reminderCard]}>
        <Ionicons color={colors.accentPressed} name="notifications-outline" size={24} />
        <View style={styles.profileText}><AppText style={styles.profileTitle}>Walking reminders</AppText><AppText style={styles.profileCaption}>Choose a daily nudge at your own pace.</AppText></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </PressableScale>

      <PressableScale accessibilityRole="button" accessibilityLabel="Blocked people" onPress={() => router.push('/blocked-people')} style={[styles.reminderCard]}>
        <Ionicons color={colors.accentPressed} name="shield-checkmark-outline" size={24} />
        <View style={styles.profileText}><AppText style={styles.profileTitle}>Blocked people</AppText><AppText style={styles.profileCaption}>Manage who can appear in your circle chat and standings.</AppText></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </PressableScale>

      {__DEV__ && user ? <PressableScale accessibilityRole="button" accessibilityLabel="Replay onboarding" onPress={handleReplayOnboarding} style={[styles.testingCard]}>
        <Ionicons color={colors.accentPressed} name="play-circle-outline" size={24} />
        <View style={styles.profileText}><AppText style={styles.profileTitle}>Replay onboarding</AppText><AppText style={styles.profileCaption}>Development only · keeps your account data.</AppText></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </PressableScale> : null}

      {__DEV__ && user ? <PressableScale accessibilityRole="button" accessibilityLabel="Replay splash screen" onPress={handleReplaySplash} style={[styles.testingCard]}>
        <Ionicons color={colors.accentPressed} name="play-circle-outline" size={24} />
        <View style={styles.profileText}><AppText style={styles.profileTitle}>Replay splash screen</AppText><AppText style={styles.profileCaption}>Development only · preview the full or quick intro.</AppText></View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </PressableScale> : null}

      <PressableScale accessibilityRole="button" onPress={() => void handleSignOut()} style={[styles.signOut]}>
        <AppText style={styles.signOutText}>Sign out</AppText>
      </PressableScale>
    </FixedHeaderScreen>
  );
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC';
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  headerContainer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }, header: { gap: 3 }, content: { gap: 14, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 40 },
  profileCard: { alignItems: 'center', backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 22, borderWidth: 2, flexDirection: 'row', marginTop: 8, padding: 18 }, profileText: { flex: 1, gap: 4, marginLeft: 14 }, profileTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, profileCaption: { color: colors.muted, fontSize: 13 }, editIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  reminderCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', minHeight: 80, padding: 18 },
  testingCard: { alignItems: 'center', backgroundColor: colors.soft, borderColor: colors.border, borderRadius: 18, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', minHeight: 80, padding: 18 },
  signOut: { alignItems: 'center', borderBottomWidth: 2, borderColor: colors.border, borderRadius: 15, borderWidth: 1, marginTop: 6, paddingVertical: 14 }, signOutText: { color: colors.accentPressed, fontSize: 15, fontWeight: '800' }, 
}); }
