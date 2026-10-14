import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, FixedHeaderScreen, StateCard } from '@/components/ui';
import { useAuth } from '@/auth/auth-provider';
import { radii, spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { useBlockedPeople } from '@/hooks/use-blocked-people';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { CircleWeeklyRecap } from './circle-weekly-recap';

export function CircleWeeklyRecapScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const blocked = useBlockedPeople(user?.uid);

  if (status === 'loading') return <View style={styles.center}><AppText tone="secondary">Loading last week’s recap…</AppText></View>;
  if (status === 'error' || !details) return <View style={styles.center}><StateCard tone="error" title="Recap unavailable" description="This circle could not be loaded. You may no longer be a member." actionLabel="Back" onAction={() => router.back()} /></View>;
  if (blocked.status !== 'ready') return <View style={styles.center}><StateCard
    actionLabel={blocked.status === 'error' ? 'Try again' : undefined}
    description={blocked.status === 'error' ? 'Your blocked-people list could not load, so member standings are hidden until it can be checked.' : 'Checking your safety settings before showing the recap.'}
    onAction={blocked.status === 'error' ? blocked.retry : undefined}
    title={blocked.status === 'error' ? 'Recap unavailable' : 'Loading recap'}
    tone={blocked.status === 'error' ? 'error' : undefined}
  /></View>;

  const visibleMembers = details.members.filter((member) => member.userId === user?.uid || !blocked.ids.has(member.userId));

  return <FixedHeaderScreen
    backgroundColor={colors.background}
    contentContainerStyle={styles.content}
    header={<View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable>
      <View style={styles.heading}><AppText accessibilityRole="header" variant="titleSmall">Last week’s recap</AppText><AppText numberOfLines={1} tone="secondary" variant="caption">{details.circle.name}</AppText></View>
      <View style={styles.spacer} />
    </View>}
    headerStyle={styles.fixedHeader}
    scrollViewProps={{ contentInsetAdjustmentBehavior: 'never' }}
  >
    <CircleWeeklyRecap circle={details.circle} members={visibleMembers} />
  </FixedHeaderScreen>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    page: { backgroundColor: colors.background, flex: 1 },
    fixedHeader: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.md },
    content: { gap: spacing.xl, paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: 48 },
    center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xxl },
    header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
    back: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    heading: { alignItems: 'center', flex: 1, gap: 2 },
    spacer: { height: 44, width: 44 },
  });
}
