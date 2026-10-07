import Svg, { Circle, Path } from 'react-native-svg';
import { Fragment, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { AppText, StateCard } from '@/components/ui';
import { dateFromKey, type StepDay } from '@/domain/walking-history';
import { radii, spacing } from '@/design-system/tokens';
import type { HistoryLoadState } from './use-walking-history';
import { historyColors } from './history-tokens';
import { isHorizontalTrailGesture, trailDayAtX, trailPositionAtX, weeklyTrail } from './weekly-trail';

export function HistoryRecap({ records, today, goal, goalReady, status, onRetry }: { records: StepDay[]; today: string; goal: number; goalReady: boolean; status: HistoryLoadState; onRetry: () => void }) {
  const trail = weeklyTrail(records, today, goalReady ? goal : 0);
  const { points: rhythm, path } = trail;
  const [selection, setSelection] = useState<{ dateKey: string; x: number; y: number } | null>(null);
  const selectedDate = selection?.dateKey;
  const chart = useRef<View>(null);
  const bounds = useRef({ left: 0, width: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const selectedIndex = rhythm.findIndex((day) => day.dateKey === selectedDate);
  const selected = rhythm[selectedIndex];
  const selectAtPageX = (pageX: number) => {
    if (bounds.current.width <= 0) return;
    const localX = pageX - bounds.current.left;
    const day = rhythm[trailDayAtX(localX, bounds.current.width)];
    setSelection({ dateKey: day.dateKey, ...trailPositionAtX(localX / bounds.current.width * 308, trail) });
  };
  const goalDays = goalReady ? rhythm.filter((day) => day.saved && day.steps >= goal).length : 0;
  const todaySteps = rhythm[6]?.steps ?? 0;
  const todayComplete = goalReady && todaySteps >= goal;

  return <View>
    <View style={styles.sectionTitle}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>This week, so far</AppText></View>
    {status === 'error' ? <StateCard tone="error" title="Recap unavailable" description="We couldn’t load your saved steps." actionLabel="Try again" onAction={onRetry} /> : status === 'loading' ? <Skeleton style={styles.skeleton} /> : <View style={styles.rhythm}>
      {selected ? <View style={styles.inspector} pointerEvents="none">
        <AppText testID="history-weekly-tooltip" accessibilityLiveRegion="polite" style={styles.inspectorText}>{`${new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(dateFromKey(selected.dateKey))} · ${selected.saved ? `${selected.steps.toLocaleString()} steps` : 'No saved steps'}`}</AppText>
      </View> : null}
      <View ref={chart} testID="history-weekly-interaction"
        onLayout={(event) => { bounds.current.width = event.nativeEvent.layout.width; chart.current?.measureInWindow((left, _top, width) => { if (width > 0) bounds.current = { left, width }; }); }}
        onTouchStart={(event) => {
          touchStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
          chart.current?.measureInWindow((left, _top, width) => { if (width > 0) bounds.current = { left, width }; });
        }}
        onMoveShouldSetResponderCapture={(event) => isHorizontalTrailGesture(event.nativeEvent.pageX - touchStart.current.x, event.nativeEvent.pageY - touchStart.current.y)}
        onResponderGrant={(event) => selectAtPageX(event.nativeEvent.pageX)}
        onResponderMove={(event) => selectAtPageX(event.nativeEvent.pageX)}
        onResponderTerminationRequest={() => true}>
      <Svg testID="history-weekly-trail" accessibilityLabel={`Walking rhythm across the last seven days. ${rhythm.map((day) => `${day.dateKey}: ${day.saved ? `${day.steps} steps` : 'no saved data'}`).join('; ')}`} accessibilityRole="image" height={74} viewBox="0 0 308 82" preserveAspectRatio="none" width="100%">
        <Path testID="history-weekly-trail-line" d={path} fill="none" stroke={historyColors.panelEdge} strokeLinecap="round" strokeLinejoin="round" strokeWidth={13} />
        <Path testID="history-weekly-trail-dots" d={path} fill="none" stroke={historyColors.blue} strokeDasharray="1 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
        {rhythm.map((point, index) => {
          const day = rhythm[index]!;
          const met = day.saved && goalReady && day.steps >= goal;
          const isToday = index === rhythm.length - 1;
          return <Fragment key={day.dateKey}>
            <Circle cx={point.x} cy={point.y} fill={isToday || !day.saved ? historyColors.paper : met ? historyColors.green : historyColors.blue} r={isToday ? 9 : met ? 8 : 7} stroke={isToday ? historyColors.ink : !day.saved ? historyColors.line : historyColors.paper} strokeWidth={isToday ? 3.5 : 3} />
            {met && !isToday ? <Path d={`M${point.x - 4} ${point.y} l3 3 5 -6`} fill="none" stroke={historyColors.paper} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /> : null}
            {isToday && day.saved ? <Circle cx={point.x} cy={point.y} fill={historyColors.blue} r={3} stroke="none" /> : null}
          </Fragment>;
        })}
        {selected && selection ? <Circle testID="history-weekly-marker" cx={selection.x} cy={trailPositionAtX(selection.x, trail).y} r={12} fill="none" stroke={historyColors.blueDeep} strokeWidth={2} /> : null}
      </Svg>
      <View style={styles.touchColumns}>{rhythm.map((day) => <Pressable key={day.dateKey} testID={`history-weekly-day-${day.dateKey}`} accessibilityRole="button" accessibilityLabel={`${new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(dateFromKey(day.dateKey))}, ${day.saved ? `${day.steps.toLocaleString()} steps` : 'No saved steps'}`} accessibilityState={{ selected: day.dateKey === selectedDate }} onPress={() => setSelection({ dateKey: day.dateKey, x: day.x, y: day.y })} style={styles.touchColumn} />)}</View>
      </View>
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
  sectionTitle: { marginBottom: spacing.md },
  title: { color: historyColors.ink, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  rhythm: { paddingTop: spacing.sm },
  inspector: { position: 'absolute', top: -8, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  inspectorText: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: historyColors.blueDeep, textAlign: 'center', backgroundColor: '#E7F8FD', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  touchColumns: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  touchColumn: { flex: 1, minHeight: 44 },
  pathLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -1 },
  pathLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800' },
  pathValues: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  pathValue: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '900', color: historyColors.ink, fontVariant: ['tabular-nums'] },
  pathValueMet: { color: historyColors.greenDeep }, pathValueToday: { color: historyColors.blueDeep },
  rhythmNote: { marginTop: 8, paddingHorizontal: 2, fontSize: 12, lineHeight: 18, color: historyColors.muted }, rhythmStrong: { color: historyColors.greenDeep, fontWeight: '800', fontSize: 12, lineHeight: 18 },
  skeleton: { width: '100%', height: 156, borderRadius: radii.md, backgroundColor: historyColors.panelEdge },
});
