import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Skeleton } from '@/components/skeleton';
import { formatSteps } from '@/data/circle';
import { useDailyStepHistory } from '@/hooks/use-daily-step-history';
import { useActivityHistory } from '@/hooks/use-activity-history';
import { getLocalDateKey } from '@/lib/daily-steps';
import { colors } from '@/theme';

type DaySummary = { date: Date; dateKey: string; label: string; steps: number; hasRecord: boolean };

export default function HistoryRoute() {
  const { user } = useAuth();
  const { records, status } = useDailyStepHistory(user?.uid);
  const activityHistory = useActivityHistory(user?.uid);
  const [selectedDay, setSelectedDay] = useState(6);
  const days = useMemo(() => getRecentDays(records), [records]);
  const day = days[selectedDay] ?? days[6];
  const totalSteps = days.reduce((total, item) => total + item.steps, 0);
  const bestDaySteps = Math.max(...days.map((item) => item.steps));
  const activeDays = days.filter((item) => item.steps > 0).length;
  const bestDay = days.find((item) => item.steps === bestDaySteps) ?? days[0];

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
    <Text style={styles.eyebrow}>YOUR HISTORY</Text>
    <Text style={styles.title}>Your progress</Text>
    <Text style={styles.description}>A private record of the movement you’ve made so far.</Text>
    <View style={styles.recap}>
      <Text style={styles.recapEyebrow}>LAST 7 DAYS</Text>
      <Text selectable style={styles.recapTotal}>{formatSteps(totalSteps)} steps</Text>
      <Text style={styles.recapText}>You were active {activeDays} of 7 days. Your biggest day was {formatShortDate(bestDay.date)} with {formatSteps(bestDaySteps)} steps.</Text>
      <View style={styles.metrics}><Metric value={String(activeDays)} label="ACTIVE DAYS" /><Metric value={formatSteps(bestDaySteps)} label="BEST DAY" /></View>
    </View>
    <Text style={styles.sectionTitle}>This week</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>{days.map((item, index) => <Pressable key={item.dateKey} accessibilityRole="tab" accessibilityState={{ selected: index === selectedDay }} onPress={() => setSelectedDay(index)} style={({ pressed }) => [styles.day, index === selectedDay && styles.dayActive, pressed && styles.dayPressed]}><Text style={[styles.dayText, index === selectedDay && styles.dayTextActive]}>{item.label}</Text><Text style={[styles.dateText, index === selectedDay && styles.dayTextActive]}>{item.date.getDate()}</Text></Pressable>)}</ScrollView>
    <View style={styles.summary}>{status === 'loading' ? <SummarySkeleton /> : status === 'error' ? <><Text style={styles.eyebrow}>HISTORY UNAVAILABLE</Text><Text style={styles.summaryText}>We could not load your saved steps. Check your connection and try again.</Text></> : <><Text style={styles.eyebrow}>{formatLongDate(day.date)}</Text><Text selectable style={styles.summarySteps}>{formatSteps(day.steps)} steps</Text><Text style={styles.summaryText}>{day.hasRecord ? 'Saved from your iPhone step count.' : 'No steps were saved for this day.'}</Text></>}</View>
    <Text style={styles.sectionTitle}>Recorded activities</Text>
    <View style={styles.activityList}>{activityHistory.status === 'loading' ? <ActivityListSkeleton /> : activityHistory.status === 'error' ? <Text style={styles.listMessage}>We could not load your recorded activities.</Text> : activityHistory.records.length === 0 ? <Text style={styles.listMessage}>Your completed runs and walks will show here.</Text> : activityHistory.records.map((activity) => <Pressable accessibilityHint={activity.route.length > 1 ? 'Opens the recorded route and activity summary' : 'Opens the activity summary'} accessibilityRole="button" key={activity.id} onPress={() => router.push({ pathname: '/activity/[activityId]', params: { activityId: activity.id } })} style={({ pressed }) => [styles.activityRow, pressed && styles.rowPressed]}><View><Text style={styles.activityDay}>{activity.activityType === 'run' ? 'Run' : 'Walk'} · {formatDateKey(activity.dateKey)}</Text><Text style={styles.activityCaption}>{formatDuration(activity.durationMs)} · {formatPace(activity.averagePaceSecondsPerKm)} /km{activity.route.length > 1 ? ' · View route' : ''}</Text></View><View style={styles.activityValue}><Text selectable style={styles.activitySteps}>{(activity.distanceMeters / 1_000).toFixed(2)} km</Text><Ionicons color={colors.muted} name="chevron-forward" size={17} /></View></Pressable>)}</View>
    <Text style={styles.sectionTitle}>Step days</Text>
    <View style={styles.activityList}>{days.slice().reverse().map((item) => <View key={item.dateKey} style={styles.activityRow}><View><Text style={styles.activityDay}>{formatShortDate(item.date)}</Text><Text style={styles.activityCaption}>{item.hasRecord ? 'Walking steps saved' : 'No activity saved'}</Text></View><Text selectable style={[styles.activitySteps, !item.hasRecord && styles.activityStepsEmpty]}>{item.hasRecord ? `${formatSteps(item.steps)} steps` : '—'}</Text></View>)}</View>
    {status === 'ready' && records.length === 0 ? <Text style={styles.emptyState}>Your history will build here as Stride saves your daily steps.</Text> : null}
  </ScrollView>;
}

function getRecentDays(records: { dateKey: string; steps: number }[]): DaySummary[] { const byDate = new Map(records.map((record) => [record.dateKey, record.steps])); const today = new Date(); today.setHours(0, 0, 0, 0); return Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); const dateKey = getLocalDateKey(date); return { date, dateKey, label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date), steps: byDate.get(dateKey) ?? 0, hasRecord: byDate.has(dateKey) }; }); }
function formatLongDate(date: Date) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', weekday: 'long' }).format(date).toUpperCase(); }
function formatShortDate(date: Date) { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date); }
function formatDateKey(dateKey: string) { const [year, month, day] = dateKey.split('-').map(Number); return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(year, month - 1, day)); }
function formatDuration(milliseconds: number) { const seconds = Math.floor(milliseconds / 1_000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function formatPace(secondsPerKm: number | null) { if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—'; return `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`; }
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text selectable style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function SummarySkeleton() { return <View style={styles.skeletonStack}><Skeleton style={{ height: 10, width: 112 }} /><Skeleton style={{ height: 32, marginTop: 5, width: 172 }} /><Skeleton style={{ height: 14, marginTop: 5, width: '86%' }} /></View>; }
function ActivityListSkeleton() { return <View>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><View style={styles.skeletonStack}><Skeleton style={{ height: 14, width: 124 }} /><Skeleton style={{ height: 11, marginTop: 7, width: 92 }} /></View><Skeleton style={{ height: 14, width: 48 }} /></View>)}</View>; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 }, description: { color: colors.muted, fontSize: 15, lineHeight: 21, maxWidth: 310 },
  recap: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 8, marginTop: 8, padding: 21 }, recapEyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, recapTotal: { color: colors.ink, fontSize: 31, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -1 }, recapText: { color: colors.muted, fontSize: 14, lineHeight: 20 }, metrics: { flexDirection: 'row', gap: 10 }, metric: { backgroundColor: colors.soft, borderRadius: 17, flex: 1, gap: 5, padding: 14 }, metricValue: { color: colors.ink, fontSize: 18, fontVariant: ['tabular-nums'], fontWeight: '800' }, metricLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 10 }, days: { gap: 9, paddingVertical: 5 }, day: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 17, height: 65, justifyContent: 'center', minWidth: 60, paddingHorizontal: 15 }, dayActive: { backgroundColor: colors.accent }, dayPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] }, dayText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, dateText: { color: colors.muted, fontSize: 11, marginTop: 2 }, dayTextActive: { color: '#FFFFFF' }, summary: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 7, minHeight: 132, padding: 21 }, skeletonStack: { gap: 0 }, skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 63, paddingHorizontal: 16 }, summarySteps: { color: colors.ink, fontSize: 29, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -1 }, summaryText: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  activityList: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: 'hidden' }, activityRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 63, paddingHorizontal: 16 }, rowPressed: { backgroundColor: colors.soft }, activityDay: { color: colors.ink, fontSize: 14, fontWeight: '800' }, activityCaption: { color: colors.muted, fontSize: 11, marginTop: 2 }, activityValue: { alignItems: 'center', flexDirection: 'row', gap: 4 }, activitySteps: { color: colors.ink, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '800' }, activityStepsEmpty: { color: colors.muted }, listMessage: { color: colors.muted, fontSize: 13, lineHeight: 19, padding: 17 }, emptyState: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
