import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Skeleton } from '@/components/skeleton';
import { AppText, IconButton, ProgressBar, StateCard } from '@/components/ui';
import { formatSteps } from '@/data/circle';
import { spacing } from '@/design-system/tokens';
import { dateFromKey, monthCellsSundayFirst, monthRange, shiftDateKey, type StepDay } from '@/domain/walking-history';
import type { HistoryLoadState } from './use-walking-history';
import { historyColors } from './history-tokens';

type Props = {
  month: string; today: string; selected: string; records: StepDay[]; goal: number;
  goalReady: boolean; protectedDays: string[]; status: HistoryLoadState; compact: boolean;
  onMonthChange: (offset: number) => void; onSelect: (day: string) => void; onRetry: () => void;
};

const GRID_GAP = 3;
const COMPACT_CELL_HEIGHT = 45;
const REGULAR_CELL_HEIGHT = 48;

export function WalkingCalendar(props: Props) {
  const { month, today, selected, records, goal, goalReady, protectedDays, status } = props;
  const cells = monthCellsSundayFirst(month);
  const byDate = new Map(records.map((day) => [day.dateKey, day.steps]));
  const [gridWidth, setGridWidth] = useState(0);
  const cellHeight = props.compact ? COMPACT_CELL_HEIGHT : REGULAR_CELL_HEIGHT;
  const rowCount = cells.length / 7;
  const gridHeight = rowCount * cellHeight + (rowCount - 1) * GRID_GAP;
  const cellWidth = gridWidth > 0 ? (gridWidth - GRID_GAP * 6) / 7 : undefined;
  const reached = (day: string | null) => Boolean(day && status === 'ready' && goalReady && (byDate.get(day) ?? 0) >= goal);
  const isCurrentMonth = monthRange(month).from === monthRange(props.today).from;
  const selectedSteps = byDate.get(selected);
  const isProtected = status === 'ready' && goalReady && protectedDays.includes(selected);
  const selectedIndex = Math.max(0, cells.findIndex((day) => day === selected));
  const selectedColumn = selectedIndex % 7;
  const nextMonthButtonStyle = [styles.navButton, isCurrentMonth && styles.disabled];
  const route = createJourneyPath(cells, byDate, protectedDays, props.today, status, gridWidth, cellHeight);

  return <View style={[styles.card, props.compact && styles.compactCard]}>
    <View style={[styles.calendarHeader, props.compact && styles.calendarHeaderCompact]}>
      <View style={[styles.calendarTitle, props.compact && styles.calendarTitleCompact]}><View style={styles.titleCopy}><AppText accessibilityRole="header" variant="titleSmall" style={[styles.title, props.compact && styles.titleCompact]}>Your walking month</AppText></View></View>
      <View style={[styles.monthNav, props.compact && styles.monthNavCompact]}>
        <IconButton accessibilityLabel="Previous month" onPress={() => props.onMonthChange(-1)} style={[styles.navButton, props.compact && styles.navButtonCompact]}><Ionicons name="chevron-back" size={22} color={historyColors.blueDeep} /></IconButton>
        <AppText variant="label" style={[styles.month, props.compact && styles.monthCompact]}>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(dateFromKey(month))}</AppText>
        <IconButton accessibilityLabel="Next month" disabled={isCurrentMonth} accessibilityState={{ disabled: isCurrentMonth }} onPress={() => props.onMonthChange(1)} style={[nextMonthButtonStyle, props.compact && styles.navButtonCompact]}><Ionicons name="chevron-forward" size={22} color={historyColors.blueDeep} /></IconButton>
      </View>
    </View>
    {status === 'error' ? <View style={styles.inset}><StateCard tone="error" title="This month couldn’t load" description="Check your connection. Your saved history is still yours." actionLabel="Try again" onAction={props.onRetry} /></View> : <>
      <View style={styles.grid}>
        <View style={styles.weekdays}>{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => <AppText key={label} variant="label" tone="secondary" style={styles.weekday}>{label}</AppText>)}</View>
        <View testID="history-calendar-grid" onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)} style={[styles.cells, { height: gridHeight }]} accessibilityLabel={status === 'loading' ? 'Loading monthly history' : undefined}>
          {route ? <Svg testID="history-journey" pointerEvents="none" width={gridWidth} height={gridHeight} style={styles.journey} viewBox={`0 0 ${gridWidth} ${gridHeight}`}><Path d={route} fill="none" stroke={historyColors.route} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></Svg> : null}
          {Array.from({ length: rowCount }, (_, row) => <View key={row} testID="history-calendar-week" style={[styles.weekRow, { height: cellHeight, marginBottom: row < rowCount - 1 ? GRID_GAP : 0 }]}>{cells.slice(row * 7, row * 7 + 7).map((day, column) => {
            const cellStyle = [styles.cell, { width: cellWidth, height: cellHeight }, cellWidth === undefined && styles.unmeasuredCell];
            if (!day) return <View key={`empty-${column}`} style={cellStyle} />;
            const future = day > props.today;
            const met = reached(day);
            const protectedDay = status === 'ready' && goalReady && protectedDays.includes(day);
            const active = selected === day;
            const today = day === props.today;
            const steps = byDate.get(day);
            // Missing records are not failed goals; a saved zero is real data.
            const below = status === 'ready' && goalReady && !future && !met && !protectedDay && typeof steps === 'number';
            const dataDescription = status === 'loading' ? 'Saved steps are loading' : future ? 'Future day' : steps === undefined ? 'No saved steps' : `${formatSteps(steps)} saved steps`;
            return <Pressable key={day} disabled={future} hitSlop={props.compact ? 4 : 2} accessibilityRole="button" accessibilityState={{ selected: active, disabled: future }} accessibilityLabel={`${new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(dateFromKey(day))}. ${dataDescription}${met ? '. Goal reached' : ''}${protectedDay ? '. Streak protected' : ''}${today ? '. Today' : ''}`} onPress={() => props.onSelect(day)} style={({ pressed }) => [cellStyle, pressed && styles.pressed]}>
              {active ? <View pointerEvents="none" style={[styles.selectionRing, props.compact && styles.selectionRingCompact, today && styles.selectionRingToday]} /> : null}
              <View style={[styles.date, props.compact && styles.dateCompact, met && styles.dateGoal, protectedDay && styles.dateProtected, below && styles.dateBelow, today && styles.today, active && styles.selected, active && today && styles.selectedToday]}>
                <AppText variant="label" style={[styles.dayNumber, met && styles.dayNumberGoal, protectedDay && styles.dayNumberState, below && styles.dayNumberBelow, future && styles.disabled]}>{dateFromKey(day).getDate()}</AppText>
              </View>
              {met ? <View pointerEvents="none" style={styles.goalMarker}><AppText style={styles.goalMarkerText}>✓</AppText></View> : protectedDay ? <Ionicons name="shield-checkmark" color={historyColors.yellow} size={13} style={styles.protectedMarker} /> : below && !today ? <View pointerEvents="none" style={styles.belowMarker}>{steps === 0 ? <AppText style={styles.goalMarkerText}>0</AppText> : null}</View> : null}
              {today && !active ? <View pointerEvents="none" style={styles.todayMarker} /> : null}
            </Pressable>;
          })}</View>)}
        </View>
      </View>
      <View style={styles.detail}>
        <View pointerEvents="none" style={[styles.detailConnector, { left: `${((selectedColumn + 0.5) / 7) * 100}%` }]} />
        {status === 'loading' ? <Skeleton style={styles.detailSkeleton} /> : <>
          <AppText variant="eyebrow" style={styles.detailDate}>{new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', weekday: 'long' }).format(dateFromKey(selected)).toUpperCase()}</AppText>
          <View style={styles.stepsRow}><AppText selectable variant="numeric" style={styles.selectedSteps}>{selectedSteps === undefined ? '—' : formatSteps(selectedSteps)}</AppText><AppText variant="bodySmall" style={{ color: historyColors.muted, fontSize: 13 }}>{goalReady ? `of ${formatSteps(goal)} steps` : selectedSteps === undefined ? 'no steps saved' : 'saved steps'}</AppText></View>
          {selectedSteps !== undefined && goalReady ? <View style={styles.progressRow}><View style={styles.progressTrack}><ProgressBar accessibilityLabel="Selected day goal progress" value={selectedSteps} max={goal} fillColor={historyColors.blue} trackColor="#DBEEF4" /></View><AppText variant="label" style={styles.progressPercent}>{Math.min(100, Math.round((selectedSteps / goal) * 100))}%</AppText></View> : null}
          <AppText variant="bodySmall" tone="secondary" style={styles.detailCaption}>{isProtected && goalReady ? 'An earned protection kept your streak going.' : selectedSteps === undefined ? 'No steps were recorded for this day.' : goalReady && selectedSteps >= goal ? 'Goal reached. Keep the journey going.' : goalReady ? `${formatSteps(Math.max(0, goal - selectedSteps))} steps to your current goal.` : 'Your goal is unavailable. Saved steps are shown above.'}</AppText>
        </>}
      </View>
    </>}
  </View>;
}

function createJourneyPath(cells: (string | null)[], byDate: Map<string, number>, protectedDays: string[], today: string, status: HistoryLoadState, width: number, cellHeight: number) {
  if (status !== 'ready' || width <= 0) return '';
  const cellWidth = (width - GRID_GAP * 6) / 7;
  const points = cells.flatMap((day, index) => {
    if (!day || day > today || (!byDate.has(day) && !protectedDays.includes(day))) return [];
    const column = index % 7;
    const row = Math.floor(index / 7);
    return [{ day, index, x: column * (cellWidth + GRID_GAP) + cellWidth / 2, y: row * (cellHeight + GRID_GAP) + cellHeight / 2 }];
  });
  let path = '';
  points.forEach((point, index) => {
    const previous = points[index - 1];
    const next = points[index + 1];
    if (!previous || previous.index !== point.index - 1 || previous.day !== shiftDateKey(point.day, -1)) path += `M ${point.x} ${point.y} `;
    if (next && next.index === point.index + 1 && next.day === shiftDateKey(point.day, 1)) path += `L ${next.x} ${next.y} `;
  });
  return path.trim();
}

const styles = StyleSheet.create({
  card: { backgroundColor: historyColors.paper, borderRadius: 24, borderColor: '#D5E9F0', borderWidth: 2, shadowColor: '#DFEEF3', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2, overflow: 'visible', paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14 },
  compactCard: { paddingHorizontal: 9, paddingTop: 13, paddingBottom: 12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingVertical: 16, gap: 8 },
  calendarHeaderCompact: { alignItems: 'center', flexWrap: 'nowrap' },
  calendarTitle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start' }, calendarTitleCompact: { flexBasis: 'auto', flexGrow: 1, flexShrink: 1, width: 'auto' },
  titleCopy: { flexShrink: 1, minWidth: 0 },
  title: { color: historyColors.ink, fontSize: 19, lineHeight: 23, letterSpacing: -0.35 }, titleCompact: { fontSize: 17, lineHeight: 20 }, monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }, monthNavCompact: { width: 'auto', justifyContent: 'center', marginLeft: 'auto' },
  navButton: { backgroundColor: 'transparent', borderColor: 'transparent', width: 42, height: 42, padding: 2 }, navButtonCompact: { width: 34, height: 36 }, month: { minWidth: 108, textAlign: 'center', color: historyColors.ink, fontSize: 14, lineHeight: 18 }, monthCompact: { minWidth: 86, fontSize: 12, lineHeight: 16 },
  grid: { paddingBottom: 0 }, weekdays: { flexDirection: 'row', marginBottom: 5 }, weekday: { width: '14.285714%', textAlign: 'center', fontSize: 11, lineHeight: 16, letterSpacing: 0.4, paddingVertical: 4 },
  cells: { position: 'relative', overflow: 'visible', flexGrow: 0, flexShrink: 0 },
  weekRow: { flexDirection: 'row', columnGap: GRID_GAP, flexGrow: 0, flexShrink: 0 },
  cell: { flexGrow: 0, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  unmeasuredCell: { flex: 1 },
  journey: { position: 'absolute', left: 0, top: 0 },
  date: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', backgroundColor: historyColors.paper }, dateCompact: { width: 33, height: 33, borderRadius: 12 },
  dateGoal: { backgroundColor: '#62C9EB', borderWidth: 0, shadowColor: '#1587AA', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }, dateProtected: { backgroundColor: historyColors.yellowPale, borderColor: '#D9AE2E' }, dateBelow: { backgroundColor: historyColors.coralPale, borderColor: '#DC8270' },
  today: { borderWidth: 2, borderColor: '#0783AA' }, selected: { backgroundColor: historyColors.paper, borderColor: 'transparent', borderWidth: 2, shadowOpacity: 0 }, selectedToday: { borderColor: '#0783AA' },
  selectionRing: { position: 'absolute', width: 42, height: 42, borderRadius: 16, borderWidth: 3, borderColor: '#27343A', backgroundColor: '#27343A', shadowColor: '#27343A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0 }, selectionRingCompact: { width: 39, height: 39, borderRadius: 15 }, selectionRingToday: { borderColor: '#173541', backgroundColor: '#173541', shadowColor: '#173541', shadowOffset: { width: 0, height: 4 } },
  dayNumber: { color: historyColors.ink, fontSize: 14, lineHeight: 17, fontVariant: ['tabular-nums'] }, dayNumberGoal: { color: '#073B50' }, dayNumberState: { color: historyColors.yellowDeep }, dayNumberBelow: { color: '#743B32' },
  goalMarker: { position: 'absolute', right: 2, bottom: 2, width: 13, height: 13, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: historyColors.paper, backgroundColor: '#21825A' }, goalMarkerText: { color: historyColors.paper, fontSize: 8, lineHeight: 10, fontWeight: '900' },
  protectedMarker: { position: 'absolute', right: 2, top: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: historyColors.paper }, belowMarker: { position: 'absolute', right: 2, bottom: 2, width: 13, height: 13, borderRadius: 7, borderWidth: 1, borderColor: historyColors.paper, backgroundColor: '#DC705D', alignItems: 'center', justifyContent: 'center' }, todayMarker: { position: 'absolute', top: 2, left: '50%', width: 5, height: 5, marginLeft: -2.5, borderRadius: 3, backgroundColor: '#0783AA', borderWidth: 1.5, borderColor: historyColors.paper },
  detail: { position: 'relative', marginHorizontal: 1, marginTop: 16, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, gap: 1, borderWidth: 1, borderColor: '#CFE5EC', borderRadius: 18, backgroundColor: historyColors.panel, shadowColor: '#DCEEF3', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0 }, detailConnector: { position: 'absolute', top: -15, width: 2, height: 15, backgroundColor: '#78CDE7' }, detailDate: { color: historyColors.blueDeep, fontSize: 11, lineHeight: 14, letterSpacing: 1 }, stepsRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 7, marginTop: 4 }, selectedSteps: { fontSize: 27, lineHeight: 32 }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 }, progressTrack: { flex: 1, minWidth: 0 }, progressPercent: { minWidth: 32, textAlign: 'right', color: historyColors.ink, fontSize: 12, lineHeight: 15 }, detailCaption: { fontSize: 12, lineHeight: 17, color: historyColors.muted, marginTop: 5 }, detailSkeleton: { width: '100%', height: 75, backgroundColor: '#DCEEF3' }, inset: { padding: spacing.lg }, disabled: { opacity: 0.35 }, pressed: { opacity: 0.7 },
});
