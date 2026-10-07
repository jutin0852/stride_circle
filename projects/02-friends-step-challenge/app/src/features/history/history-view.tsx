import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/skeleton';
import { AppText, StateCard } from '@/components/ui';
import { spacing } from '@/design-system/tokens';
import { homeColors } from '@/features/home/tokens';
import type { StepDay } from '@/domain/walking-history';
import type { ActivityRecord } from '@/lib/activities';
import type { StreakSummary } from '@/lib/streaks';
import { HistoryRecap } from './history-recap';
import { MilestonesSheet } from './milestones-sheet';
import { SavedWalks } from './saved-walks';
import { StreakBanner } from './streak-banner';
import { historyColors } from './history-tokens';
import type { HistoryLoadState } from './use-walking-history';
import { WalkingCalendar } from './walking-calendar';

type Data<T> = { records: T[]; status: HistoryLoadState; refresh: () => void };
export type HistoryViewProps = {
  today: string; month: string; selected: string; summary: StreakSummary;
  overview: Data<StepDay>; calendar: Data<StepDay>; walks: Data<ActivityRecord>;
  goal: { goal: number; status: HistoryLoadState }; refreshing: boolean;
  onRefresh: () => void; onMonthChange: (offset: number) => void;
  onSelect: (day: string) => void; onOpenWalk: (id: string) => void;
};

/** Presentation-only view; previews exercise the same UI without auth or health data. */
export function HistoryView(props: HistoryViewProps) {
  const { today, month, selected, overview, calendar, goal, walks, summary } = props;
  const [milestonesVisible, setMilestonesVisible] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 360;
  const streakReady = overview.status === 'ready' && goal.status === 'ready';
  const streakError = overview.status === 'error' || goal.status === 'error';
  return <>
    <ScrollView contentInsetAdjustmentBehavior="never" style={styles.page} refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} tintColor={homeColors.edge} />} contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { paddingHorizontal: compact ? spacing.lg : spacing.xl, paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.header}><View style={styles.heading}><AppText variant="eyebrow" style={styles.kicker}>YOUR JOURNEY</AppText><AppText accessibilityRole="header" variant="headline" style={styles.title}>History</AppText></View><View accessible={false} style={styles.headerIcon}><Ionicons name="calendar-outline" size={20} color={homeColors.edge} /></View></View>
        {streakReady ? <StreakBanner summary={summary} onPress={() => setMilestonesVisible(true)} /> : streakError ? <StateCard tone="error" title="Your streak couldn’t load" description="We need your saved steps and daily goal before calculating milestones." actionLabel="Try again" onAction={props.onRefresh} /> : <Skeleton style={{ width: '100%', height: 82, borderRadius: 20, backgroundColor: historyColors.panelEdge }} />}
        <WalkingCalendar month={month} today={today} selected={selected} records={calendar.records} goal={goal.goal} goalReady={goal.status === 'ready'} protectedDays={streakReady ? summary.protectedDateKeys : []} status={calendar.status} compact={compact} onMonthChange={props.onMonthChange} onSelect={props.onSelect} onRetry={calendar.refresh} />
        <HistoryRecap records={overview.records} today={today} goal={goal.goal} goalReady={goal.status === 'ready'} status={overview.status} onRetry={overview.refresh} />
        <SavedWalks records={walks.records} status={walks.status} onOpen={props.onOpenWalk} onRetry={walks.refresh} />
      </View>
    </ScrollView>
    {streakReady && milestonesVisible ? <MilestonesSheet visible onClose={() => setMilestonesVisible(false)} summary={summary} /> : null}
  </>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: historyColors.screen }, scroll: { alignItems: 'center' },
  content: { width: '100%', maxWidth: 600, gap: spacing.xl, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, heading: { flex: 1, gap: spacing.xs },
  kicker: { color: historyColors.blueDeep, fontSize: 12, letterSpacing: 1.4, fontWeight: '900' }, title: { color: historyColors.ink, fontSize: 30, lineHeight: 34, letterSpacing: -0.7 },
  headerIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: historyColors.paper, borderColor: historyColors.line, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowColor: historyColors.line, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
});
