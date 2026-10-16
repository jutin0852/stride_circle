import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { AppText, Button } from '@/components/ui';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { useCircleInvites, useFriends } from '@/hooks/use-people';
import { acceptCircleInvite, deleteCircleInvite, getPeopleErrorMessage, type CircleInvite } from '@/lib/people';

/** Circle invitations waiting for an answer, plus the way into Find people. Shown at the top of the Circles tab. */
export function PeopleShortcuts({ onJoined }: { onJoined: () => void }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const invites = useCircleInvites(user?.uid);
  const friends = useFriends(user?.uid);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function answer(invite: CircleInvite, accept: boolean) {
    if (busyId || !user) return;
    setBusyId(invite.id);
    setError(null);
    try {
      if (accept) {
        await acceptCircleInvite({ invite, user });
        onJoined();
      } else {
        await deleteCircleInvite(invite);
      }
    } catch (answerError) {
      setError(getPeopleErrorMessage(answerError));
    } finally {
      setBusyId(null);
    }
  }

  const requestCount = friends.incoming.length;
  return (
    <View style={styles.wrap}>
      {invites.value.length > 0 ? (
        <View style={styles.card}>
          <AppText accessibilityRole="header" variant="titleSmall">Circle invitations</AppText>
          {invites.value.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.inviteCopy}>
                <AppText numberOfLines={1} variant="label">{invite.circleName}</AppText>
                <AppText numberOfLines={1} tone="tertiary" variant="caption">From {invite.inviterDisplayName}</AppText>
              </View>
              <Button loading={busyId === invite.id} onPress={() => void answer(invite, true)} size="small">Join</Button>
              <Button disabled={busyId === invite.id} onPress={() => void answer(invite, false)} size="small" variant="tertiary">Decline</Button>
            </View>
          ))}
          {error ? <AppText accessibilityLiveRegion="polite" tone="danger" variant="caption">{error}</AppText> : null}
        </View>
      ) : null}

      <Pressable accessibilityHint="Search for people by name or username" accessibilityLabel="Find people" accessibilityRole="button" onPress={() => router.push('/people')} style={({ pressed }) => [styles.findRow, pressed && styles.pressed]}>
        <Ionicons color={colors.accentPressed} name="people-outline" size={22} />
        <View style={styles.inviteCopy}>
          <AppText variant="label">Find people</AppText>
          <AppText tone="tertiary" variant="caption">{requestCount > 0 ? `${requestCount} friend request${requestCount === 1 ? '' : 's'} waiting` : 'Search by name or username to add friends.'}</AppText>
        </View>
        <Ionicons color={colors.muted} name="chevron-forward" size={20} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    wrap: { gap: spacing.md, marginBottom: spacing.lg },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, gap: spacing.sm, padding: spacing.lg },
    inviteRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    inviteCopy: { flex: 1, gap: 2 },
    findRow: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg },
    pressed: { opacity: 0.8 },
  });
}
