import Svg, { Circle, Path } from 'react-native-svg';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { AppText, StateCard } from '@/components/ui';
import { dateFromKey, sevenDayRhythm, type StepDay } from '@/domain/walking-history';
import { radii, spacing } from '@/design-system/tokens';
import type { HistoryLoadState } from './use-walking-history';
import { historyColors } from './history-tokens';

const RHYTHM_PATH = 'M22 53 C39 62 49 43 66 30 C83 16 92 22 110 61 C127 77 138 44 154 29 C170 16 184 31 198 34 C214 39 228 35 242 24 C259 12 271 35 286 48';
const RHYTHM_POINTS = [
  { x: 22, y: 53 }, { x: 66, y: 30 }, { x: 110, y: 61 }, { x: 154, y: 29 },
  { x: 198, y: 34 }, { x: 242, y: 24 }, { x: 286, y: 48 },
];

export function HistoryRecap({ records, today, goal, goalReady, status, onRetry }: { records: StepDay[]; today: string; goal: number; goalReady: boolean; status: HistoryLoadState; onRetry: () => void }) {
  const rhythm = sevenDayRhythm(records, today);
  const goalDays = goalReady ? rhythm.filter((day) => day.steps >= goal).length : 0;
  const todaySteps = rhythm[6]?.steps ?? 0;
  const todayComplete = goalReady && todaySteps >= goal;

  return <View style={styles.section}>
    <View style={styles.sectionTitle}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>This week, so far</AppText></View>
    {status === 'error' ? <StateCard tone="error" title="Recap unavailable" description="We couldn’t load your saved steps." actionLabel="Try again" onAction={onRetry} /> : status === 'loading' ? <Skeleton style={styles.skeleton} /> : <View style={styles.rhythm}>
      <Svg accessibilityLabel="Walking rhythm across the last seven days" accessibilityRole="image" height={74} viewBox="0 0 308 82" width="100%">
        <Path d={RHYTHM_PATH} fill="none" stroke="#C9EFF9" strokeLinecap="round" strokeLinejoin="round" strokeWidth={13} />
        <Path d={RHYTHM_PATH} fill="none" stroke="#48B8DD" strokeDasharray="1 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
        {RHYTHM_POINTS.map((point, index) => {
          const day = rhythm[index]!;
          const met = goalReady && day.steps >= goal;
          const isToday = index === rhythm.length - 1;
          return <Fragment key={day.dateKey}>
            <Circle cx={point.x} cy={point.y} fill={isToday ? historyColors.paper : met ? historyColors.green : historyColors.blue} r={isToday ? 9 : met ? 8 : 7} stroke={isToday ? historyColors.ink : historyColors.paper} strokeWidth={isToday ? 3.5 : 3} />
            {met && !isToday ? <Path d={`M${point.x - 4} ${point.y} l3 3 5 -6`} fill="none" stroke={historyColors.paper} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> : null}
            {isToday ? <Circle cx={point.x} cy={point.y} fill={historyColors.blueDeep} r={3} stroke="none" /> : null}
          </Fragment>;
        })}
      </Svg>
      <View style={styles.pathLabels}>{rhythm.map((day) => <AppText key={day.dateKey} variant="label" tone="secondary" style={styles.pathLabel}>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(dateFromKey(day.dateKey))}</AppText>)}</View>
      <View style={styles.pathValues}>{rhythm.map((day, index) => <AppText key={day.dateKey} variant="label" style={[styles.pathValue, goalReady && day.steps >= goal && styles.pathValueMet, index === rhythm.length - 1 && styles.pathValueToday]}>{formatRhythmSteps(day.steps)}</AppText>)}</View>
      <AppText variant="bodySmall" tone="secondary" style={styles.rhythmNote}><AppText variant="bodySmall" style={styles.rhythmStrong}>{goalDays} goal {goalDays === 1 ? 'day' : 'days'}</AppText> · {todayComplete ? 'today’s goal is complete' : 'today’s walk is still unfolding'}</AppText>
    </View>}
  </View>;
}

function formatRhythmSteps(steps: number) {
  if (steps === 0) return '—';
  return steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps);
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xxl },
  sectionTitle: { paddingHorizontal: spacing.xs, marginBottom: spacing.sm },
  title: { color: historyColors.ink },
  rhythm: { paddingTop: 0 },
  pathLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 7, marginTop: -1 },
  pathLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  pathValues: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, marginTop: spacing.xs },
  pathValue: { flex: 1, textAlign: 'center', fontSize: 11, color: historyColors.ink, fontVariant: ['tabular-nums'] },
  pathValueMet: { color: historyColors.greenDeep }, pathValueToday: { color: historyColors.blueDeep },
  rhythmNote: { marginTop: spacing.sm, paddingHorizontal: spacing.xs }, rhythmStrong: { color: historyColors.greenDeep, fontWeight: '800' },
  skeleton: { width: '100%', height: 156, borderRadius: radii.md, backgroundColor: '#DCEEF3' },
});
