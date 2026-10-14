import { useMemo, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, FixedHeaderScreen, StateCard } from '@/components/ui';
import { getDateKeyInTimeZone, getWeekDateKeys } from '@/domain/dates';
import { aggregateCircleSteps } from '@/features/circles/leaderboard-model';
import { CircleWeeklyGoalCard } from '@/features/circles/circle-weekly-goal';
import { radii, spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { useAuth } from '@/auth/auth-provider';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { useCirclePeriodSteps } from '@/hooks/use-circle-period-steps';

type ActivityDestination = 'recap' | 'walks';

const OPTIONS: { description: string; icon: ComponentProps<typeof Ionicons>['name']; label: string; route: ActivityDestination }[] = [
  { description: 'See how your circle did last week', icon: 'stats-chart-outline', label: 'Last week’s recap', route: 'recap' },
  { description: 'Plan a walk and meet up together', icon: 'walk-outline', label: 'Walk together', route: 'walks' },
];

export function CircleActivityScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const timeZone = details?.circle.competitionTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDateKey = getDateKeyInTimeZone(new Date(), timeZone);
  const dates = useMemo(() => getWeekDateKeys(currentDateKey).filter((dateKey) => dateKey <= currentDateKey), [currentDateKey]);
  const { stepsByDate, status: goalStatus } = useCirclePeriodSteps(details?.circle.id, dates, [currentDateKey]);
  const memberIds = useMemo(() => (details?.members ?? []).map((member) => member.userId), [details?.members]);
  const weeklySteps = useMemo(() => {
    const totals = aggregateCircleSteps(dates, stepsByDate, memberIds);
    return Object.values(totals).reduce((total, steps) => total + steps, 0);
  }, [dates, memberIds, stepsByDate]);

  if (status === 'loading') return <View style={styles.center}><AppText tone="secondary">Loading circle activity…</AppText></View>;
  if (status === 'error' || !details) return <View style={styles.center}><StateCard tone="error" title="Activity unavailable" description="This circle could not be loaded. You may no longer be a member." actionLabel="Back" onAction={() => router.back()} /></View>;

  return <FixedHeaderScreen
    backgroundColor={colors.background}
    contentContainerStyle={styles.content}
    header={<View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable>
      <View style={styles.heading}><AppText accessibilityRole="header" variant="titleSmall">Activity</AppText><AppText numberOfLines={1} tone="secondary" variant="caption">{details.circle.name}</AppText></View>
      <View style={styles.spacer} />
    </View>}
    headerStyle={styles.fixedHeader}
    scrollViewProps={{ contentInsetAdjustmentBehavior: 'never' }}
  >
    <AppText tone="secondary" variant="bodySmall">Make progress together, revisit your wins, and plan your next walk.</AppText>
    {goalStatus === 'ready' ? <CircleWeeklyGoalCard circleId={details.circle.id} goal={details.circle.weeklyStepGoal ?? null} steps={weeklySteps} canManage={details.circle.ownerId === user?.uid} /> : null}
    {goalStatus === 'loading' ? <AppText tone="secondary" variant="caption">Loading shared goal progress…</AppText> : null}
    {goalStatus === 'error' ? <StateCard tone="error" title="Goal progress unavailable" description="The shared weekly progress could not load." /> : null}
    <View style={styles.options}>{OPTIONS.map((option) => <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.label}
      key={option.route}
      onPress={() => router.push({ pathname: `/circle/[circleId]/${option.route}`, params: { circleId: details.circle.id } })}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.optionIcon}><Ionicons color={colors.accentPressed} name={option.icon} size={20} /></View>
      <View style={styles.optionCopy}><AppText variant="label">{option.label}</AppText><AppText numberOfLines={2} tone="secondary" variant="caption">{option.description}</AppText></View>
      <Ionicons color={colors.muted} name="chevron-forward" size={18} />
    </Pressable>)}</View>
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
    options: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
    option: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 78, paddingHorizontal: spacing.lg },
    optionIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
    optionCopy: { flex: 1, gap: 3 },
    pressed: { backgroundColor: colors.soft },
  });
}
