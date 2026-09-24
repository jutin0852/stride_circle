import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { Skeleton } from '@/components/skeleton';
import { useActivityRecord } from '@/hooks/use-activity-record';
import { colors } from '@/theme';

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number | null) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—';
  return `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`;
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(year, month - 1, day));
}

export default function ActivityDetailRoute() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const { user } = useAuth();
  const { record, status } = useActivityRecord(user?.uid, activityId);
  const insets = useSafeAreaInsets();
  const initialRegion = useMemo(() => {
    const point = record?.route[0];
    return point ? { ...point, latitudeDelta: 0.012, longitudeDelta: 0.012 } : undefined;
  }, [record?.route]);

  if (status === 'loading') return <View style={styles.loading}><Skeleton style={{ height: 280, width: '100%' }} /><View style={styles.loadingCard}><Skeleton style={{ height: 12, width: 92 }} /><Skeleton style={{ height: 34, marginTop: 8, width: 198 }} /><Skeleton style={{ height: 70, marginTop: 20, width: '100%' }} /></View></View>;

  if (status === 'error' || !record) return <View style={styles.emptyPage}><Ionicons color={colors.muted} name="map-outline" size={34} /><Text style={styles.emptyTitle}>{status === 'error' ? 'Route unavailable' : 'Activity not found'}</Text><Text style={styles.emptyText}>{status === 'error' ? 'We could not load this activity. Check your connection and try again.' : 'This activity may have been removed or is no longer available.'}</Text><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backToHistory}><Text style={styles.backToHistoryText}>Back to History</Text></Pressable></View>;

  const hasRoute = record.route.length > 1;
  return <View style={styles.page}>
    <ActivityMap fallback={<View style={styles.mapFallback}><View style={styles.mapFallbackIcon}><Ionicons color={colors.accent} name="map-outline" size={30} /></View><Text style={styles.mapFallbackTitle}>{hasRoute ? 'Route map is available in the iPhone app.' : 'Route not available'}</Text><Text style={styles.mapFallbackText}>{hasRoute ? 'Open this activity on your phone to see the route.' : 'This was saved before route recording was added.'}</Text></View>} fitRoute initialRegion={initialRegion} route={record.route} style={StyleSheet.absoluteFill} />
    <Pressable accessibilityLabel="Go back to History" accessibilityRole="button" onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 12 }]}><Ionicons color={colors.ink} name="chevron-back" size={23} /></Pressable>
    <View style={[styles.summary, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.grabber} />
      <View style={styles.activityHeading}><View style={styles.activityIcon}><MaterialCommunityIcons color={colors.accent} name={record.activityType === 'run' ? 'run' : 'walk'} size={22} /></View><View><Text style={styles.eyebrow}>{record.activityType === 'run' ? 'RUN' : 'WALK'} · {formatDate(record.dateKey).toUpperCase()}</Text><Text accessibilityRole="header" style={styles.title}>{record.activityType === 'run' ? 'Your run' : 'Your walk'}</Text></View></View>
      <View style={styles.metrics}><Metric label="DISTANCE" value={`${(record.distanceMeters / 1_000).toFixed(2)} km`} /><Metric label="DURATION" value={formatDuration(record.durationMs)} /><Metric label="AVG. PACE" value={`${formatPace(record.averagePaceSecondsPerKm)} /km`} /></View>
    </View>
  </View>;
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text selectable style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  page: { backgroundColor: '#DDE8EF', flex: 1 },
  loading: { backgroundColor: colors.background, flex: 1 }, loadingCard: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -30, minHeight: 230, padding: 22 },
  emptyPage: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 28 }, emptyTitle: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 16 }, emptyText: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 270, textAlign: 'center' }, backToHistory: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, justifyContent: 'center', marginTop: 24, minHeight: 50, paddingHorizontal: 20 }, backToHistoryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  mapFallback: { alignItems: 'center', backgroundColor: '#E9F1F7', flex: 1, justifyContent: 'center', paddingBottom: 220, paddingHorizontal: 30 }, mapFallbackIcon: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 }, mapFallbackTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 13, textAlign: 'center' }, mapFallbackText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center' },
  backButton: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 22, height: 44, justifyContent: 'center', left: 18, position: 'absolute', width: 44 },
  summary: { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, bottom: 0, left: 0, paddingHorizontal: 22, paddingTop: 10, position: 'absolute', right: 0 }, grabber: { alignSelf: 'center', backgroundColor: '#C8CDD7', borderRadius: 4, height: 4, width: 38 }, activityHeading: { alignItems: 'center', flexDirection: 'row', gap: 11, marginTop: 20 }, activityIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 21, height: 42, justifyContent: 'center', width: 42 }, eyebrow: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }, title: { color: colors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.6, marginTop: 2 }, metrics: { flexDirection: 'row', gap: 8, marginTop: 20 }, metric: { backgroundColor: colors.soft, borderRadius: 16, flex: 1, gap: 5, padding: 12 }, metricValue: { color: colors.ink, fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.3 }, metricLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
});
