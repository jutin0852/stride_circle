import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { ActivitySummarySheet } from '@/components/activity-summary-sheet';
import { ActivityMap } from '@/components/activity-map';
import { CelebrationSheet } from '@/components/celebration-sheet';
import { saveActivity } from '@/lib/activities';
import { useActivityTracking, type FinishedActivity, type GpsSignalStatus } from '@/hooks/use-activity-tracking';
import { colors } from '@/theme';

type ActivityType = 'walk' | 'run';
const defaultRegion = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.035, longitudeDelta: 0.035 };

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number | null) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—';
  return `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`;
}

export default function ActivityRoute() {
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [finishedActivity, setFinishedActivity] = useState<FinishedActivity | null>(null);
  const [isSummaryVisible, setSummaryVisible] = useState(false);
  const [isCompletionVisible, setCompletionVisible] = useState(false);
  const { user } = useAuth();
  const tracking = useActivityTracking();
  const insets = useSafeAreaInsets();
  const isRun = activityType === 'run';
  const averagePace = tracking.distanceMeters > 0 ? tracking.elapsedMs / 1_000 / (tracking.distanceMeters / 1_000) : null;
  const isMoving = tracking.status === 'tracking' || tracking.status === 'paused';
  const activityTitle = tracking.status === 'tracking' ? `Recording your ${isRun ? 'run' : 'walk'}` : tracking.status === 'paused' ? 'Activity paused' : tracking.status === 'finished' ? 'Nice work.' : isRun ? 'Ready to run?' : 'Ready to walk?';

  const primaryAction = () => {
    if (tracking.status === 'idle' || tracking.status === 'denied' || tracking.status === 'error') { setCompletionVisible(false); setFinishedActivity(null); setSaveState('idle'); void tracking.start(); return; }
    if (tracking.status === 'finished') { setCompletionVisible(false); setFinishedActivity(null); tracking.reset(); setSaveState('idle'); void tracking.start(); return; }
    if (tracking.status === 'paused') { void tracking.resume(); return; }
    tracking.pause();
  };

  const finishActivity = () => {
    const activity = tracking.finish();
    if (!activity) return;
    setFinishedActivity(activity);
    setSummaryVisible(true);
  };

  const saveFinishedActivity = async () => {
    if (!user || !finishedActivity || saveState === 'saving') return;
    setSaveState('saving');
    try {
      await saveActivity({
        activityType,
        distanceMeters: finishedActivity.distanceMeters,
        durationMs: finishedActivity.durationMs,
        route: finishedActivity.route,
        userId: user.uid,
      });
      setSaveState('saved');
      setSummaryVisible(false);
      setCompletionVisible(true);
    } catch {
      setSaveState('error');
    }
  };

  const primaryLabel = tracking.status === 'tracking' ? 'Pause' : tracking.status === 'paused' ? 'Resume' : tracking.status === 'finished' ? 'New activity' : 'Start';

  const discardActivity = () => {
    setSummaryVisible(false);
    setFinishedActivity(null);
    tracking.reset();
    setSaveState('idle');
  };

  const dismissCompletion = () => {
    setCompletionVisible(false);
    setFinishedActivity(null);
    tracking.reset();
    setSaveState('idle');
  };

  return <View style={styles.page}>
    <ActivityMap currentLocation={tracking.currentLocation} fallback={<View style={styles.mapFallback}><Text style={styles.mapFallbackText}>Maps are available in the iPhone app.</Text></View>} initialRegion={defaultRegion} route={tracking.route} showsUserLocation style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[styles.topOverlay, { top: insets.top + 12 }]}>
      <Text style={styles.eyebrow}>RECORD ACTIVITY</Text>
      <Text style={styles.title}>{activityTitle}</Text>
      <Text style={styles.status}>{saveState === 'saving' ? 'Saving your activity…' : saveState === 'saved' ? 'Saved to your history.' : saveState === 'error' ? 'We could not save this activity.' : statusMessage(tracking.status, tracking.gpsSignal, tracking.accuracyMeters)}</Text>
    </View>
    <View style={[styles.metricCard, { bottom: 176 + Math.max(insets.bottom, 8) }]}>
      <Text style={styles.trackerType}>{isRun ? 'RUN' : 'WALK'}</Text>
      <View style={styles.metrics}>
        <Metric value={formatDuration(tracking.elapsedMs)} label="TIME" />
        <Metric value={formatPace(averagePace)} label="AVG. PACE /KM" />
        <Metric value={(tracking.distanceMeters / 1_000).toFixed(2)} label="DISTANCE KM" />
      </View>
      {tracking.status === 'tracking' ? <Text style={styles.livePace}>Live pace {formatPace(tracking.currentPaceSecondsPerKm)} /km</Text> : null}
    </View>
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 22) }]}>
      <View style={styles.grabber} />
      <View style={styles.controls}>
        <Pressable disabled={isMoving} accessibilityRole="button" onPress={() => setActivityType((type) => type === 'run' ? 'walk' : 'run')} style={({ pressed }) => [styles.activityButton, isMoving && styles.disabled, pressed && styles.pressed]}>
          <View style={styles.activitySymbol}><MaterialCommunityIcons color={colors.accent} name={isRun ? 'run' : 'walk'} size={27} /></View><Text style={styles.activityButtonLabel}>{isRun ? 'Run' : 'Walk'}</Text><Text style={styles.activityButtonHint}>{isMoving ? 'Activity active' : 'Tap to change'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={primaryAction} style={({ pressed }) => [styles.startControl, pressed && styles.pressed]}><View style={styles.startButton}><Ionicons color="#FFFFFF" name={tracking.status === 'tracking' ? 'pause' : 'play'} size={25} /></View><Text style={styles.startText}>{primaryLabel}</Text></Pressable>
        {isMoving ? <Pressable accessibilityRole="button" onPress={finishActivity} style={({ pressed }) => [styles.finishButton, pressed && styles.pressed]}><View style={styles.finishIcon}><Ionicons color={colors.ink} name="stop" size={16} /></View><Text style={styles.finishText}>Finish</Text></Pressable> : <View style={styles.finishPlaceholder} />}
      </View>
      {tracking.status === 'denied' ? <View style={styles.recovery}><Text style={styles.permissionMessage}>Location access is off. Turn it on to record your route, distance, and pace.</Text><Pressable accessibilityRole="button" onPress={() => void Linking.openURL('app-settings:')} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><Text style={styles.settingsButtonText}>Open Settings</Text></Pressable></View> : tracking.gpsSignal === 'disabled' ? <Text style={styles.permissionMessage}>Location Services are turned off on this iPhone. Turn them on in Settings, then try again.</Text> : tracking.status === 'error' ? <Text style={styles.permissionMessage}>We could not start GPS. Check your location settings and try again.</Text> : tracking.gpsSignal === 'weak' && isMoving ? <View style={styles.weakSignal}><Ionicons color="#9A3412" name="location-outline" size={17} /><Text style={styles.weakSignalText}>Weak GPS signal. Your time continues, but route distance pauses until accuracy improves.</Text></View> : <Text style={styles.note}>Finish to review your route and decide whether to save it.</Text>}
    </View>
    {finishedActivity ? <ActivitySummarySheet activityType={activityType} distanceMeters={finishedActivity.distanceMeters} durationMs={finishedActivity.durationMs} isSaving={saveState === 'saving'} onDiscard={discardActivity} onSave={() => void saveFinishedActivity()} saveError={saveState === 'error'} visible={isSummaryVisible} /> : null}
    <CelebrationSheet
      body={`${((finishedActivity?.distanceMeters ?? 0) / 1_000).toFixed(2)} km in ${formatDuration(finishedActivity?.durationMs ?? 0)}. Your activity is saved in History.`}
      onDismiss={dismissCompletion}
      primaryLabel="Done"
      title="Activity saved"
      visible={isCompletionVisible}
    />
  </View>;
}

function statusMessage(status: ReturnType<typeof useActivityTracking>['status'], gpsSignal: GpsSignalStatus, accuracyMeters: number | null) {
  if (status === 'requesting') return 'Getting your location…';
  if (status === 'tracking' && gpsSignal === 'acquiring') return 'Finding a GPS signal…';
  if (status === 'tracking' && gpsSignal === 'weak') return 'GPS signal is weak — route is paused.';
  if (status === 'tracking' && gpsSignal === 'ready') return accuracyMeters === null ? 'Tracking live' : `GPS ready · ±${Math.round(accuracyMeters)} m`;
  if (status === 'tracking') return 'Tracking live';
  if (status === 'paused') return 'Paused';
  if (status === 'finished') return 'Your activity is ready to save next.';
  return 'Start when you are ready.';
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  page: { backgroundColor: '#DDE8EF', flex: 1 }, mapFallback: { alignItems: 'center', backgroundColor: '#DDE8EF', flex: 1, justifyContent: 'center' }, mapFallbackText: { color: colors.muted, fontSize: 15 }, topOverlay: { backgroundColor: 'rgba(255,255,255,0.94)', borderColor: colors.border, borderRadius: 18, borderWidth: 1, left: 18, padding: 15, position: 'absolute', right: 18 }, eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 }, status: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 }, metricCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderColor: colors.border, borderRadius: 22, borderWidth: 1, left: 18, padding: 20, position: 'absolute', right: 18 }, trackerType: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 17, textAlign: 'center' }, metrics: { flexDirection: 'row' }, metric: { alignItems: 'center', flex: 1 }, metricValue: { color: colors.ink, fontSize: 23, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.8 }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.45, marginTop: 5 }, livePace: { color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 16, textAlign: 'center' }, sheet: { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, bottom: 0, left: 0, paddingHorizontal: 22, paddingTop: 10, position: 'absolute', right: 0 }, grabber: { alignSelf: 'center', backgroundColor: '#C8CDD7', borderRadius: 2, height: 4, width: 38 }, controls: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, activityButton: { alignItems: 'center', minWidth: 78 }, disabled: { opacity: 0.55 }, activitySymbol: { alignItems: 'center', backgroundColor: '#E8F0FF', borderRadius: 27, height: 54, justifyContent: 'center', width: 54 }, activityButtonLabel: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 6 }, activityButtonHint: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 2 }, startControl: { alignItems: 'center', minWidth: 78 }, startButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 34, height: 68, justifyContent: 'center', width: 68 }, startText: { color: colors.accent, fontSize: 14, fontWeight: '900', marginTop: 7 }, finishButton: { alignItems: 'center', minWidth: 78 }, finishIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 27, height: 54, justifyContent: 'center', width: 54 }, finishText: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 6 }, finishPlaceholder: { minWidth: 78 }, recovery: { alignItems: 'center', marginTop: 10 }, permissionMessage: { color: '#B42318', fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' }, settingsButton: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 12, justifyContent: 'center', marginTop: 9, minHeight: 38, paddingHorizontal: 14 }, settingsButtonText: { color: colors.accentPressed, fontSize: 13, fontWeight: '900' }, weakSignal: { alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 12, flexDirection: 'row', gap: 7, marginTop: 12, padding: 10 }, weakSignalText: { color: '#9A3412', flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 15 }, note: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 14, textAlign: 'center' }, pressed: { opacity: 0.84, transform: [{ scale: 0.96 }] },
});
