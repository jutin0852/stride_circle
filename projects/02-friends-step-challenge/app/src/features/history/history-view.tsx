import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { StreakBanner } from '@/components/streak-banner';
import { AppText, FixedHeaderScreen, StateCard } from '@/components/ui';
import { spacing } from '@/design-system/tokens';
import type { StepDay } from '@/domain/walking-history';
import type { ActivityRecord } from '@/lib/activities';
import type { StreakSummary } from '@/lib/streaks';
import { HistoryRecap } from './history-recap';
import { MilestonesSheet } from './milestones-sheet';
import { SavedWalks } from './saved-walks';
import { useHistoryTheme } from './history-tokens';
import type { HistoryColorSet } from './history-tokens';
import type { HistoryLoadState } from './use-walking-history';
import { WalkingCalendar } from './walking-calendar';

type Data<T> = { records: T[]; status: HistoryLoadState; refresh: () => void };
export type HistoryViewProps = {
  today: string; month: string; selected: string; summary: StreakSummary;
  overview: Data<StepDay>; calendar: Data<StepDay>; walks: Data<ActivityRecord>;
  goal: { goal: number; status: HistoryLoadState }; refreshing: boolean;
  weeklyGoal?: { goal: number; status: HistoryLoadState };
  onRefresh: () => void; onMonthChange: (offset: number) => void;
  onSelect: (day: string) => void; onOpenWalk: (id: string) => void; onEditWeeklyGoal?: () => void;
};

/** Presentation-only view; previews exercise the same UI without auth or health data. */
export function HistoryView(props: HistoryViewProps) {
  const { today, month, selected, overview, calendar, goal, walks, summary } = props;
  const [milestonesVisible, setMilestonesVisible] = useState(false);
  const { colors: historyColors } = useHistoryTheme();
  const styles = useMemo(() => createStyles(historyColors), [historyColors]);
  const { width, fontScale } = useWindowDimensions();
  const milestonesTriggerRef = useRef<View>(null);
  const compact = width < 360 || fontScale > 1.3;
  const streakReady = overview.status === 'ready' && goal.status === 'ready';
  const streakError = overview.status === 'error' || goal.status === 'error';
  return <>
    <FixedHeaderScreen
      backgroundColor={historyColors.screen}
      contentContainerStyle={[styles.scroll, styles.content, { paddingHorizontal: compact ? spacing.lg : spacing.xl, paddingTop: spacing.xl }]}
      header={<View testID="history-fixed-header" style={[styles.header, { width: '100%', maxWidth: 600, paddingHorizontal: compact ? spacing.lg : spacing.xl }]}><View style={styles.heading}><AppText variant="eyebrow" style={styles.kicker}>YOUR JOURNEY</AppText><AppText accessibilityRole="header" variant="headline" style={styles.title}>History</AppText></View><View accessible={false} style={styles.headerIcon}><Ionicons name="calendar-outline" size={20} color={historyColors.blueDeep} /></View></View>}
      headerStyle={styles.fixedHeader}
      scrollViewProps={{ contentInsetAdjustmentBehavior: 'never', refreshControl: <RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} tintColor={historyColors.blueDeep} /> }}
    >
      {streakReady ? <StreakBanner streakDays={summary.currentStreak} accessibilityLabel={`${summary.currentStreak} day walking streak. View your milestones`} triggerRef={milestonesTriggerRef} onPress={() => setMilestonesVisible(true)} /> : streakError ? <StateCard tone="error" title="Your streak couldn’t load" description="We need your saved steps and daily goal before calculating milestones." actionLabel="Try again" onAction={props.onRefresh} /> : <Skeleton style={{ width: '100%', height: 82, borderRadius: 20, backgroundColor: historyColors.panelEdge }} />}
      <WalkingCalendar month={month} today={today} selected={selected} records={calendar.records} goal={goal.goal} goalReady={goal.status === 'ready'} protectedDays={streakReady ? summary.protectedDateKeys : []} status={calendar.status} compact={compact} onMonthChange={props.onMonthChange} onSelect={props.onSelect} onRetry={calendar.refresh} />
      <HistoryRecap records={overview.records} today={today} goal={goal.goal} goalReady={goal.status === 'ready'} weeklyGoal={props.weeklyGoal?.goal} weeklyGoalReady={props.weeklyGoal?.status === 'ready'} onEditWeeklyGoal={props.onEditWeeklyGoal} status={overview.status} onRetry={overview.refresh} />
      <SavedWalks dateKey={selected} records={walks.records} status={walks.status} onOpen={props.onOpenWalk} onRetry={walks.refresh} />
    </FixedHeaderScreen>
    {streakReady ? <MilestonesSheet visible={milestonesVisible} onClose={() => setMilestonesVisible(false)} returnFocusRef={milestonesTriggerRef} summary={summary} /> : null}
  </>;
}

function createStyles(historyColors: HistoryColorSet) { return StyleSheet.create({
  fixedHeader: { alignItems: 'center' },
  scroll: { alignItems: 'center' },
  content: { width: '100%', maxWidth: 600, gap: spacing.xxl, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, heading: { flex: 1, gap: spacing.xs },
  kicker: { color: historyColors.blueDeep, fontSize: 12, letterSpacing: 1.4, fontWeight: '900' }, title: { color: historyColors.ink, fontSize: 30, lineHeight: 34, letterSpacing: -0.7 },
  headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: historyColors.paper, borderColor: historyColors.line, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowColor: historyColors.line, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
}); }
