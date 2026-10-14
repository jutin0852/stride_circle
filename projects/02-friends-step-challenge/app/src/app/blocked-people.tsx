import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/auth-provider';
import { AppText, Button, FixedHeaderScreen, IconButton, StateCard } from '@/components/ui';
import { useBlockedPeople } from '@/hooks/use-blocked-people';
import { unblockPerson } from '@/lib/circle-safety';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';

export default function BlockedPeopleRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const blocked = useBlockedPeople(user?.uid);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirmUnblock(userId: string, displayName: string) {
    Alert.alert('Unblock ' + displayName + '?', 'Their messages can appear in your circle chat again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: () => void finishUnblock(userId) },
    ]);
  }

  async function finishUnblock(userId: string) {
    if (!user?.uid || pendingId) return;
    setPendingId(userId);
    setError(null);
    try {
      await unblockPerson({ blockedUserId: userId, userId: user.uid });
    } catch {
      setError('This person could not be unblocked. Check your connection and try again.');
    } finally {
      setPendingId(null);
    }
  }

  return <FixedHeaderScreen
    backgroundColor={colors.background}
    contentContainerStyle={styles.content}
    header={<View style={styles.header}>
      <IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
      <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">Blocked people</AppText>
      <View style={styles.spacer} />
    </View>}
    headerStyle={styles.headerContainer}
  >
    <AppText tone="secondary" variant="bodySmall">People you block are hidden from your circle standings and chat. You can unblock them here.</AppText>
    {blocked.status === 'loading' ? <StateCard description="Loading your blocked list." title="Loading" /> : null}
    {blocked.status === 'error' ? <StateCard actionLabel="Try again" description="Your blocked list could not load. Check your connection and retry." onAction={blocked.retry} title="Blocked list unavailable" tone="error" /> : null}
    {blocked.status === 'ready' && blocked.people.length === 0 ? <StateCard description="If you block someone in a circle, you can manage that choice here." title="No blocked people" /> : null}
    {blocked.status === 'ready' ? blocked.people.map((person) => <View key={person.userId} style={styles.personRow}>
      <View style={styles.personIcon}><Ionicons color={colors.muted} name="person-outline" size={19} /></View>
      <View style={styles.personCopy}><AppText style={styles.personName} variant="label">{person.displayName}</AppText><AppText tone="tertiary" variant="caption">Blocked</AppText></View>
      <Button disabled={pendingId === person.userId} loading={pendingId === person.userId} onPress={() => confirmUnblock(person.userId, person.displayName)} size="small" variant="tertiary">Unblock</Button>
    </View>) : null}
    {error ? <AppText accessibilityLiveRegion="polite" tone="danger" variant="caption">{error}</AppText> : null}
  </FixedHeaderScreen>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  headerContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  title: { color: colors.ink, flex: 1, textAlign: 'center' },
  spacer: { width: 44 },
  content: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.xxxl },
  personRow: { alignItems: 'center', backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 72 },
  personIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  personCopy: { flex: 1, gap: 2, minWidth: 0 },
  personName: { color: colors.ink },
}); }
