import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { AppText, Button, IconButton } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { averagePace, formatWalkPace, formatWalkTime } from '@/domain/walk';
import { useActivityTracking } from '@/hooks/use-activity-tracking';
import { useWalks } from '@/hooks/use-walks';
import { getBackgroundRecording } from '@/lib/background-activity';
import { finishRecording, newRecording } from '@/lib/activity-recording';
import { activityFromSession, saveLocalWalk, syncPendingWalks } from '@/services/walks/repository';

export function WalkRecorder() {
  const { user } = useAuth();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const tracking = useActivityTracking(user?.uid);
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const walks = useWalks(user?.uid);
  const plan = walks.routes.find(r => r.id === (tracking.plannedRouteId ?? routeId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => { AccessibilityInfo.announceForAccessibility(tracking.status === 'paused' ? 'Walk paused' : tracking.status === 'tracking' ? 'Walk recording' : 'Walk ready'); }, [tracking.status]);

  async function finish() {
    if (!user || lock.current) return;
    lock.current = true; setSaving(true); setError(null);
    try {
      const restored = getBackgroundRecording().session;
      const result = restored?.userId === user.uid && restored.status === 'finished' ? { session: restored } : await tracking.finish();
      if (!result) throw new Error('The walk could not finish. Your progress is preserved.');
      let session = result.session;
      if (!session && 'route' in result) {
        session = finishRecording({ ...newRecording(Crypto.randomUUID(), user.uid, 'walk', Date.now() - result.durationMs), route: result.route,
          distanceMeters: result.distanceMeters, elapsedMs: result.durationMs, startedAt: null }, Date.now());
      }
      if (!session) throw new Error('Your walk could not be recovered.');
      await saveLocalWalk(activityFromSession(session));
      if (getBackgroundRecording().issue === 'stop') throw new Error('Walk saved. Retry stopping location before leaving.');
      tracking.reset();
      void syncPendingWalks(user.uid).catch(() => {});
      router.replace({ pathname: '/walk/[id]', params: { id: session.id } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Save failed. Your walk is preserved; try again.'); }
    finally { lock.current = false; setSaving(false); }
  }
  const active = tracking.status === 'tracking';
  const paused = tracking.status === 'paused';
  const finished = tracking.status === 'finished';
  return <View style={[styles.page, { backgroundColor: colors.background }]}>
    <View style={styles.map}><ActivityMap currentLocation={tracking.currentLocation} route={tracking.route} plannedRoute={plan?.coordinates} showsUserLocation style={StyleSheet.absoluteFill} /></View>
    <View style={[styles.heading, { top: insets.top + 8, backgroundColor: colors.card, borderColor: colors.border }]}>
      <IconButton accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></IconButton>
      <View style={styles.fill}><AppText variant="titleSmall">{active ? 'Recording your walk' : paused ? 'Walk paused' : finished ? 'Ready to save' : 'Start a walk'}</AppText><AppText variant="caption">{plan?.name ?? (tracking.gpsSignal === 'weak' ? 'Weak GPS · route distance is paused' : tracking.isRestoring ? 'Restoring your walk' : tracking.locationMode === 'foreground' ? 'Foreground only · locking pauses recording' : 'Your route stays private')}</AppText></View>
    </View>
    <ScrollView style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]} contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20), gap: 12 }}>
      <View style={styles.stats}>
        <Stat label="Steps" value={tracking.steps === null ? 'Unavailable' : tracking.steps.toLocaleString()} />
        <Stat label="Distance" value={`${(tracking.distanceMeters / 1000).toFixed(2)} km`} />
        <Stat label="Active time" value={formatWalkTime(tracking.elapsedMs / 1000)} />
        <Stat label="Average pace" value={formatWalkPace(averagePace(tracking.elapsedMs / 1000, tracking.distanceMeters))} />
      </View>
      {tracking.pauseReason === 'recovered' ? <AppText accessibilityRole="alert">Your interrupted walk was recovered. Resume or save it.</AppText> : null}
      {tracking.steps === null && process.env.EXPO_OS !== 'web' ? <Button variant="tertiary" disabled={saving} onPress={() => { void tracking.requestStepAccess().catch(() => setError('Step access is unavailable. Your GPS walk can still record.')); }}>Connect step data</Button> : null}
      {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
      {tracking.backgroundIssue === 'storage' ? <AppText accessibilityRole="alert" tone="danger">Recording paused because your phone could not save progress. Check available storage, then retry. Your last saved recording is preserved.</AppText> : null}
      {tracking.backgroundIssue === 'stop' ? <Button variant="danger" onPress={tracking.retryStop}>Retry stopping location</Button> : null}
      {tracking.status === 'denied' ? <><AppText tone="danger">Location access is denied. Allow access in phone Settings to record a route.</AppText><Button variant="tertiary" onPress={() => void Linking.openSettings()}>Open Settings</Button></> : null}
      {tracking.status === 'error' ? <AppText accessibilityRole="alert" tone="danger">GPS could not start. Check Location Services and try again.</AppText> : null}
      <View style={styles.controls}>
        {!finished ? <Button style={styles.fill} disabled={saving || tracking.isPreparing} loading={tracking.isPreparing} onPress={() => { if (active) tracking.pause(); else if (paused) void tracking.resume(); else void tracking.start('walk', plan?.id); }} trailing={<Ionicons name={active ? 'pause' : 'play'} size={18} color={colors.onAccent} />}>{active ? 'Pause' : paused ? 'Resume' : 'Start Walk'}</Button> : null}
        {active || paused || finished ? <Button style={styles.fill} variant="tertiary" loading={saving} onPress={() => {
          if (finished) { void finish(); return; }
          Alert.alert('Finish this walk?', 'Your walk will be saved privately in History.', [{ text: 'Keep walking', style: 'cancel' }, { text: 'Finish & save', onPress: () => { void finish(); } }]);
        }}>{finished ? 'Save walk' : 'Finish'}</Button> : null}
      </View>
    </ScrollView>
  </View>;
}
export function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}><AppText variant="stat" style={{ fontSize: 22, lineHeight: 28 }}>{value}</AppText><AppText variant="caption">{label}</AppText></View>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, map: { flex: 1, minHeight: 180 }, heading: { position: 'absolute', left: 16, right: 16, padding: 8, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 2, borderBottomWidth: 4, borderRadius: 8 }, fill: { flex: 1, minWidth: 0 }, panel: { flexGrow: 0, maxHeight: '48%', borderTopWidth: 2 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { width: '46%', minWidth: 120, gap: 3 }, controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } });
