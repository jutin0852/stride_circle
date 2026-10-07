import Svg, { Circle, Path } from 'react-native-svg';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { AppText, StateCard } from '@/components/ui';
import { dateFromKey, type StepDay } from '@/domain/walking-history';
import { radii, spacing } from '@/design-system/tokens';
import type { HistoryLoadState } from './use-walking-history';
import { historyColors } from './history-tokens';
import { weeklyTrail } from './weekly-trail';

export function HistoryRecap({ records, today, goal, goalReady, status, onRetry }: { records: StepDay[]; today: string; goal: number; goalReady: boolean; status: HistoryLoadState; onRetry: () => void }) {
  const { points: rhythm, path } = weeklyTrail(records, today, goalReady ? goal : 0);
  const goalDays = goalReady ? rhythm.filter((day) => day.steps >= goal).length : 0;
  const todaySteps = rhythm[6]?.steps ?? 0;
  const todayComplete = goalReady && todaySteps >= goal;

  return <View style={styles.section}>
    <View style={styles.sectionTitle}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>This week, so far</AppText></View>
    {status === 'error' ? <StateCard tone="error" title="Recap unavailable" description="We couldn’t load your saved steps." actionLabel="Try again" onAction={onRetry} /> : status === 'loading' ? <Skeleton style={styles.skeleton} /> : <View style={styles.rhythm}>
      <Svg testID="history-weekly-trail" accessibilityLabel={`Walking rhythm across the last seven days. ${rhythm.map((day) => `${day.dateKey}: ${day.saved ? `${day.steps} steps` : 'no saved data'}`).join('; ')}`} accessibilityRole="image" height={74} viewBox="0 0 308 82" width="100%">
        <Path testID="history-weekly-trail-line" d={path} fill="none" stroke="#C9EFF9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={13} />
        <Path d={path} fill="none" stroke="#48B8DD" strokeDasharray="1 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
        {rhythm.map((point, index) => {
          const day = rhythm[index]!;
          const met = goalReady && day.steps >= goal;
          const isToday = index === rhythm.length - 1;
          return <Fragment key={day.dateKey}>
            <Circle cx={point.x} cy={point.y} fill={isToday || !day.saved ? historyColors.paper : met ? historyColors.green : '#13B5E8'} r={isToday ? 9 : met ? 8 : 7} stroke={isToday ? historyColors.ink : !day.saved ? historyColors.line : historyColors.paper} strokeWidth={isToday ? 3.5 : 3} />
            {met && !isToday ? <Path d={`M${point.x - 4} ${point.y} l3 3 5 -6`} fill="none" stroke={historyColors.paper} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> : null}
            {isToday ? <Circle cx={point.x} cy={point.y} fill={met ? historyColors.green : '#13B5E8'} r={3} stroke="none" /> : null}
          </Fragment>;
        })}
      </Svg>
      <View style={styles.pathLabels}>{rhythm.map((day) => <AppText key={day.dateKey} variant="label" tone="secondary" style={styles.pathLabel}>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dateFromKey(day.dateKey))}</AppText>)}</View>
      <View style={styles.pathValues}>{rhythm.map((day, index) => <AppText key={day.dateKey} variant="label" style={[styles.pathValue, goalReady && day.steps >= goal && styles.pathValueMet, index === rhythm.length - 1 && styles.pathValueToday]}>{day.saved ? formatRhythmSteps(day.steps) : '—'}</AppText>)}</View>
      <AppText variant="bodySmall" tone="secondary" style={styles.rhythmNote}>{goalReady ? <AppText variant="bodySmall" style={styles.rhythmStrong}>{goalDays} goal {goalDays === 1 ? 'day' : 'days'}</AppText> : 'Goal unavailable'} · {todayComplete ? 'today’s goal is complete' : 'today’s walk is still unfolding'}</AppText>
    </View>}
  </View>;
}

function formatRhythmSteps(steps: number) {
  return steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps);
}

const styles = StyleSheet.create({
  section: { marginTop: 26 },
  sectionTitle: { marginBottom: 10, paddingVertical: 16 },
  title: { color: historyColors.ink, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  rhythm: { paddingTop: 8 },
  pathLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -1 },
  pathLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  pathValues: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  pathValue: { flex: 1, textAlign: 'center', fontSize: 11, color: historyColors.ink, fontVariant: ['tabular-nums'] },
  pathValueMet: { color: historyColors.greenDeep }, pathValueToday: { color: historyColors.blueDeep },
  rhythmNote: { marginTop: 8, paddingHorizontal: 2, fontSize: 12, lineHeight: 18, color: historyColors.muted }, rhythmStrong: { color: historyColors.greenDeep, fontWeight: '800', fontSize: 12, lineHeight: 18 },
  skeleton: { width: '100%', height: 156, borderRadius: radii.md, backgroundColor: '#DCEEF3' },
});
