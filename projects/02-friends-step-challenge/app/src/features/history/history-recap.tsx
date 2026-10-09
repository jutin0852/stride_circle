import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart } from 'panelui-native/components/bar-chart';

import { AppText, ProgressBar, StateCard } from '@/components/ui';
import { formatSteps } from '@/data/circle';
import { getWeekDateKeys } from '@/domain/dates';
import { dateFromKey, type StepDay } from '@/domain/walking-history';
import { spacing } from '@/design-system/tokens';
import type { HistoryLoadState } from './use-walking-history';
import { useHistoryTheme } from './history-tokens';
import type { HistoryColorSet } from './history-tokens';

export function HistoryRecap({ records, today, goal, goalReady, weeklyGoal, weeklyGoalReady, onEditWeeklyGoal, status, onRetry }: { records: StepDay[]; today: string; goal: number; goalReady: boolean; weeklyGoal?: number; weeklyGoalReady?: boolean; onEditWeeklyGoal?: () => void; status: HistoryLoadState; onRetry: () => void }) {
  const { colors: historyColors } = useHistoryTheme();
  const styles = useMemo(() => createStyles(historyColors), [historyColors]);
  const weekDates = useMemo(() => getWeekDateKeys(today), [today]);
  const stepsByDate = useMemo(() => new Map(records.map((record) => [record.dateKey, record.steps])), [records]);
  const savedDates = useMemo(() => new Set(records.map((record) => record.dateKey)), [records]);
  const chartData = useMemo(() => weekDates.map((dateKey) => {
    const future = dateKey > today;
    const rawSteps = stepsByDate.get(dateKey) ?? 0;
    return {
      dateKey,
      day: formatWeekday(dateKey),
      future: future ? 1 : 0,
      saved: savedDates.has(dateKey) ? 1 : 0,
      steps: future || !Number.isFinite(rawSteps) ? 0 : Math.max(0, rawSteps),
    };
  }), [savedDates, stepsByDate, today, weekDates]);
  const maxDaySteps = Math.max(0, ...chartData.map((day) => day.steps));
  const scaleMax = getScaleMax(goalReady ? goal : 0, maxDaySteps);
  const goalDays = goalReady ? chartData.filter((day) => day.future === 0 && day.saved === 1 && day.steps >= goal).length : 0;
  const weeklySteps = chartData.reduce((total, day) => total + (day.future ? 0 : day.steps), 0);
  const todaySteps = stepsByDate.get(today) ?? 0;
  const todayComplete = goalReady && todaySteps >= goal;

  return <View>
    <View style={styles.sectionTitle}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>This week, so far</AppText></View>
    {status === 'ready' && weeklyGoalReady && weeklyGoal ? <View style={styles.weeklyGoal}>
      <View style={styles.weeklyGoalHeading}><AppText variant="label">Weekly target</AppText>{onEditWeeklyGoal ? <Pressable accessibilityRole="button" accessibilityLabel="Change weekly step target" onPress={onEditWeeklyGoal} hitSlop={8}><AppText variant="caption" style={styles.changeGoal}>Change</AppText></Pressable> : null}</View>
      <AppText variant="titleSmall">{formatSteps(weeklySteps)} <AppText tone="secondary" variant="bodySmall">of {formatSteps(weeklyGoal)} steps</AppText></AppText>
      <ProgressBar accessibilityLabel="Weekly step target progress" value={weeklySteps} max={weeklyGoal} fillColor={historyColors.blue} trackColor={historyColors.panel} />
      <AppText tone="secondary" variant="caption">Steps saved from your health data this week.</AppText>
    </View> : null}
    {status === 'error' ? <StateCard tone="error" title="Recap unavailable" description="We couldn’t load your saved steps." actionLabel="Try again" onAction={onRetry} /> : <View style={styles.chartSection}>
      <BarChart
        accessibilityLabel="Your saved steps from Monday through Sunday this week"
        accessibilityLabelForDatum={(datum) => `${String(datum.day)}: ${datum.future ? 'Future day' : datum.saved ? `${Number(datum.steps).toLocaleString()} steps` : 'No saved steps'}`}
        aspectRatio={1.7}
        data={chartData}
        minBarLength={2}
        testID="history-weekly-bar-chart"
        status={status === 'loading' ? 'loading' : 'ready'}
        yDomain={[0, scaleMax]}
        xDataKey="day"
      >
        {status === 'loading' ? <BarChart.Skeleton bars={7} color={historyColors.panelEdge} /> : null}
        <BarChart.Grid color={historyColors.line} opacity={0.8} rows={4} />
        <BarChart.Bar color={historyColors.blue} cornerRadius={6} dataKey="steps" />
        <BarChart.XAxis ticks={7} />
        <BarChart.YAxis format={formatChartSteps} ticks={4} />
        <BarChart.Tooltip formatValue={(value) => `${value.toLocaleString()} steps`} formatX={(datum) => formatDateLabel(String(datum.dateKey))} />
      </BarChart>
      <AppText variant="bodySmall" tone="secondary" style={styles.rhythmNote}>{goalReady ? <AppText variant="bodySmall" style={styles.rhythmStrong}>{goalDays} goal {goalDays === 1 ? 'day' : 'days'}</AppText> : 'Goal unavailable'} · {todayComplete ? 'today’s goal is complete' : 'today’s walk is still unfolding'}</AppText>
    </View>}
  </View>;
}

function formatWeekday(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dateFromKey(dateKey));
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(dateFromKey(dateKey));
}

function getScaleMax(goal: number, maxDaySteps: number) {
  const baseline = Math.max(8000, goal, maxDaySteps);
  return Math.ceil(baseline / 4000) * 4000;
}

function formatChartSteps(value: number) {
  const rounded = Math.max(0, Math.round(value));
  if (rounded < 1000) return rounded.toLocaleString();
  const thousands = Number((rounded / 1000).toFixed(1));
  return `${thousands}k`;
}

function createStyles(historyColors: HistoryColorSet) { return StyleSheet.create({
  sectionTitle: { marginBottom: spacing.lg },
  title: { color: historyColors.ink, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  chartSection: { paddingTop: spacing.xs },
  weeklyGoal: { backgroundColor: historyColors.panel, borderColor: historyColors.panelLine, borderRadius: 16, borderWidth: 1, gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md },
  weeklyGoalHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  changeGoal: { color: historyColors.blueDeep, fontWeight: '800' },
  rhythmNote: { marginTop: spacing.md, paddingHorizontal: 2, fontSize: 12, lineHeight: 18, color: historyColors.muted },
  rhythmStrong: { color: historyColors.greenDeep, fontWeight: '800', fontSize: 12, lineHeight: 18 },
}); }
