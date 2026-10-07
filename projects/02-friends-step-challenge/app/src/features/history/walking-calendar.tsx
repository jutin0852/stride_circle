import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Skeleton } from '@/components/skeleton';
import { AppText, IconButton, ProgressBar, StateCard } from '@/components/ui';
import { formatSteps } from '@/data/circle';
import { radii, spacing } from '@/design-system/tokens';
import { dateFromKey, monthCellsSundayFirst, monthRange, shiftDateKey, type StepDay } from '@/domain/walking-history';
import type { HistoryLoadState } from './use-walking-history';
import { historyColors } from './history-tokens';

type Props = {
  month: string; today: string; selected: string; records: StepDay[]; goal: number;
  goalReady: boolean; protectedDays: string[]; status: HistoryLoadState; compact: boolean;
  onMonthChange: (offset: number) => void; onSelect: (day: string) => void; onRetry: () => void;
};

const GRID_GAP = 3;
const COMPACT_CELL_HEIGHT = 36;
const REGULAR_CELL_HEIGHT = 40;

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
      <View style={[styles.calendarTitle, props.compact && styles.calendarTitleCompact]}><View style={styles.titleCopy}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>{'Your walking\nmonth'}</AppText></View></View>
      <View style={[styles.monthNav, props.compact && styles.monthNavCompact]}>
        <IconButton accessibilityLabel="Previous month" onPress={() => props.onMonthChange(-1)} style={styles.navButton}><Ionicons name="chevron-back" size={18} color={historyColors.blueDeep} /></IconButton>
        <AppText variant="label" style={styles.month}>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(dateFromKey(month))}</AppText>
        <IconButton accessibilityLabel="Next month" disabled={isCurrentMonth} accessibilityState={{ disabled: isCurrentMonth }} onPress={() => props.onMonthChange(1)} style={nextMonthButtonStyle}><Ionicons name="chevron-forward" size={18} color={historyColors.blueDeep} /></IconButton>
      </View>
    </View>
    {status === 'error' ? <View style={styles.inset}><StateCard tone="error" title="This month couldn’t load" description="Check your connection. Your saved history is still yours." actionLabel="Try again" onAction={props.onRetry} /></View> : <>
      <View style={[styles.grid, !props.compact && styles.gridInset]}>
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
            // Missing and explicitly zero-step days stay visually quiet. A
            // below-goal state needs positive saved movement to support it.
            const below = !future && !met && !protectedDay && typeof steps === 'number' && steps > 0;
            const dataDescription = status === 'loading' ? 'Saved steps are loading' : future ? 'Future day' : steps === undefined ? 'No saved steps' : `${formatSteps(steps)} saved steps`;
            return <Pressable key={day} disabled={future} hitSlop={props.compact ? 4 : 2} accessibilityRole="button" accessibilityState={{ selected: active, disabled: future }} accessibilityLabel={`${new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(dateFromKey(day))}. ${dataDescription}${met ? '. Goal reached' : ''}${protectedDay ? '. Streak protected' : ''}${today ? '. Today' : ''}`} onPress={() => props.onSelect(day)} style={({ pressed }) => [cellStyle, pressed && styles.pressed]}>
              <View style={[styles.date, props.compact && styles.dateCompact, met && styles.dateGoal, protectedDay && styles.dateProtected, below && styles.dateBelow, today && styles.today, active && styles.selected, active && today && styles.selectedToday]}>
                <AppText variant="label" style={[styles.dayNumber, met && styles.dayNumberGoal, (protectedDay || below) && styles.dayNumberState, future && styles.disabled]}>{dateFromKey(day).getDate()}</AppText>
              </View>
              {met ? <View pointerEvents="none" style={styles.goalMarker}><AppText style={styles.goalMarkerText}>✓</AppText></View> : protectedDay ? <Ionicons name="shield-checkmark" color={historyColors.yellow} size={13} style={styles.protectedMarker} /> : below && !today ? <View pointerEvents="none" style={styles.belowMarker} /> : null}
              {today ? <View pointerEvents="none" style={styles.todayMarker} /> : null}
            </Pressable>;
          })}</View>)}
        </View>
      </View>
      <View style={styles.legend} accessibilityLabel="Calendar legend"><Legend kind="route" label="Walking journey" /><Legend kind="goal" label="Goal reached" /><Legend kind="protected" label="Protected" /><Legend kind="below" label="Below goal" /><Legend kind="selected" label="Selected" /></View>
      <View style={styles.detail}>
        <View pointerEvents="none" style={[styles.detailConnector, { left: `${((selectedColumn + 0.5) / 7) * 100}%` }]} />
        {status === 'loading' ? <Skeleton style={styles.detailSkeleton} /> : <>
          <AppText variant="eyebrow" style={styles.detailDate}>{selected === props.today ? 'TODAY' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', weekday: 'short' }).format(dateFromKey(selected)).toUpperCase()}</AppText>
          <View style={styles.stepsRow}><AppText selectable variant="numeric" style={styles.selectedSteps}>{selectedSteps === undefined ? '—' : formatSteps(selectedSteps)}</AppText><AppText variant="bodySmall" tone="secondary">{goalReady ? `of ${formatSteps(goal)} steps` : selectedSteps === undefined ? 'no steps saved' : 'saved steps'}</AppText></View>
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
    if (!day || day > today || ((byDate.get(day) ?? 0) <= 0 && !protectedDays.includes(day))) return [];
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

function Legend({ kind, label }: { kind: 'route' | 'goal' | 'protected' | 'below' | 'selected'; label: string }) {
  const shapeStyle = { route: styles.legendRoute, goal: styles.legendGoal, protected: styles.legendProtected, below: styles.legendBelow, selected: styles.legendSelected }[kind];
  return <View style={styles.legendItem}><View style={[styles.legendShape, shapeStyle]} /><AppText variant="label" tone="secondary" style={styles.legendText}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: historyColors.paper, borderRadius: radii.xl, borderColor: '#D5E9F0', borderWidth: 2, borderBottomWidth: 5, overflow: 'visible' },
  compactCard: { marginHorizontal: -12 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 6 },
  calendarHeaderCompact: { alignItems: 'center', flexWrap: 'nowrap' },
  calendarTitle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start' }, calendarTitleCompact: { flexBasis: 'auto', flexGrow: 1, flexShrink: 1, width: 'auto' },
  titleCopy: { flexShrink: 1, minWidth: 0 },
  title: { color: historyColors.ink, fontSize: 16, lineHeight: 18, letterSpacing: -0.2 }, monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0 }, monthNavCompact: { width: 'auto', justifyContent: 'center', marginLeft: 'auto' },
  navButton: { backgroundColor: 'transparent', borderColor: 'transparent', width: 32, height: 32, padding: 2 }, month: { minWidth: 88, textAlign: 'center', color: historyColors.ink, fontSize: 11, lineHeight: 15 },
  grid: { paddingBottom: 0 }, gridInset: { paddingHorizontal: 2 }, weekdays: { flexDirection: 'row', marginBottom: 2 }, weekday: { width: '14.285714%', textAlign: 'center', fontSize: 9, lineHeight: 12, letterSpacing: 0.2, paddingVertical: 2 },
  cells: { position: 'relative', overflow: 'visible', flexGrow: 0, flexShrink: 0 },
  weekRow: { flexDirection: 'row', columnGap: GRID_GAP, flexGrow: 0, flexShrink: 0 },
  cell: { flexGrow: 0, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  unmeasuredCell: { flex: 1 },
  journey: { position: 'absolute', left: 0, top: 0 },
  date: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', backgroundColor: historyColors.paper }, dateCompact: { width: 26, height: 26, borderRadius: 9 },
  dateGoal: { backgroundColor: '#62C9EB', borderColor: '#1587AA', borderBottomWidth: 3 }, dateProtected: { backgroundColor: historyColors.yellowPale, borderColor: '#D9AE2E' }, dateBelow: { backgroundColor: historyColors.coralPale, borderColor: '#DC8270' },
  today: { borderColor: historyColors.blueDeep }, selected: { backgroundColor: historyColors.paper, borderColor: '#27343A', borderWidth: 3, transform: [{ translateY: 0 }] }, selectedToday: { borderColor: historyColors.ink },
  dayNumber: { color: historyColors.ink, fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] }, dayNumberGoal: { color: '#073B50' }, dayNumberState: { color: historyColors.yellowDeep },
  goalMarker: { position: 'absolute', right: 1, bottom: 1, width: 10, height: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 5, borderWidth: 1, borderColor: historyColors.paper, backgroundColor: '#21825A' }, goalMarkerText: { color: historyColors.paper, fontSize: 7, lineHeight: 8, fontWeight: '900' },
  protectedMarker: { position: 'absolute', right: 1, top: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: historyColors.paper }, belowMarker: { position: 'absolute', right: 2, bottom: 2, width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: historyColors.paper, backgroundColor: historyColors.coral }, todayMarker: { position: 'absolute', top: 2, left: '50%', width: 5, height: 5, marginLeft: -2.5, borderRadius: 3, backgroundColor: '#0783AA', borderWidth: 1.5, borderColor: historyColors.paper },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5, rowGap: 2, paddingHorizontal: 2, paddingTop: 7, paddingBottom: 0 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 }, legendText: { fontSize: 8, lineHeight: 11 }, legendShape: { width: 9, height: 9 }, legendRoute: { width: 14, height: 2, borderRadius: 2, backgroundColor: historyColors.route }, legendGoal: { borderRadius: 3, backgroundColor: '#62C9EB', borderBottomWidth: 1, borderBottomColor: '#1587AA' }, legendProtected: { borderRadius: 3, backgroundColor: '#FFF0B2', borderWidth: 1, borderColor: '#D6AA23' }, legendBelow: { borderRadius: 5, backgroundColor: historyColors.coralPale, borderWidth: 1, borderColor: '#DC8270' }, legendSelected: { borderRadius: 3, backgroundColor: 'transparent', borderWidth: 1, borderColor: historyColors.ink },
  detail: { position: 'relative', marginHorizontal: 1, marginTop: 8, marginBottom: 6, padding: 10, paddingLeft: 10, gap: 1, borderWidth: 1, borderColor: '#CFE5EC', borderRadius: 12, backgroundColor: historyColors.panel, shadowColor: historyColors.shade, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.75, shadowRadius: 0, elevation: 1 }, detailConnector: { position: 'absolute', top: -10, width: 2, height: 9, backgroundColor: '#78CDE7' }, detailDate: { color: historyColors.blueDeep, fontSize: 9, lineHeight: 12, letterSpacing: 0.8 }, stepsRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 3 }, selectedSteps: { fontSize: 24, lineHeight: 27 }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, progressTrack: { flex: 1, minWidth: 0 }, progressPercent: { minWidth: 28, textAlign: 'right', color: historyColors.ink, fontSize: 9, lineHeight: 12 }, detailCaption: { fontSize: 10, lineHeight: 14, color: historyColors.muted }, detailSkeleton: { width: '100%', height: 60, backgroundColor: '#DCEEF3' }, inset: { padding: spacing.lg }, disabled: { opacity: 0.35 }, pressed: { opacity: 0.7 },
});
