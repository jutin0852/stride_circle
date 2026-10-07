import { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { ActivitySummarySheet } from '@/components/activity-summary-sheet';
import { ActivityMap } from '@/components/activity-map';
import { CelebrationSheet } from '@/components/celebration-sheet';
import { createActivityId, saveActivity } from '@/lib/activities';
import { getLocalDateKey } from '@/lib/daily-steps';
import { useActivityTracking, type FinishedActivity, type GpsSignalStatus } from '@/hooks/use-activity-tracking';
import { useAppColors } from '@/design-system/use-app-theme';

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
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [finishedActivity, setFinishedActivity] = useState<FinishedActivity | null>(null);
  const [isSummaryVisible, setSummaryVisible] = useState(false);
  const [isCompletionVisible, setCompletionVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(190);
  const savingRef = useRef(false);
  const finishingRef = useRef(false);
  const activityIdRef = useRef<string | null>(null);
  const finishedDateRef = useRef('');
  const { user } = useAuth();
  const tracking = useActivityTracking(user?.uid);
  const insets = useSafeAreaInsets();
  const averagePace = tracking.distanceMeters > 0 ? tracking.elapsedMs / 1_000 / (tracking.distanceMeters / 1_000) : null;
  const isMoving = tracking.status === 'tracking' || tracking.status === 'paused';
  const activityTitle = tracking.status === 'tracking' ? 'Recording your walk' : tracking.status === 'paused' ? 'Walk paused' : tracking.status === 'finished' ? 'Nice work.' : 'Ready to walk?';

  const primaryAction = () => {
    if (tracking.isPreparing || savingRef.current || finishingRef.current) return;
    if (tracking.status === 'idle' || tracking.status === 'denied' || tracking.status === 'error') { setCompletionVisible(false); setFinishedActivity(null); setSaveState('idle'); void tracking.start('walk'); return; }
    if (tracking.status === 'finished') { setCompletionVisible(false); setFinishedActivity(null); tracking.reset(); setSaveState('idle'); void tracking.start('walk'); return; }
    if (tracking.status === 'paused') { if (tracking.canResume) void tracking.resume(); else void finishActivity(); return; }
    tracking.pause();
  };

  const finishActivity = async () => {
    if (finishingRef.current || savingRef.current) return;
    finishingRef.current = true;
    setIsFinishing(true);
    try {
      const activity = await tracking.finish();
      if (!activity) return;
      activityIdRef.current = activity.activityId ?? null;
      finishedDateRef.current = activity.dateKey ?? getLocalDateKey();
      setFinishedActivity(activity);
      setSummaryVisible(true);
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  };

  const saveFinishedActivity = async () => {
    if (!user || !finishedActivity || savingRef.current) return;
    if (finishedActivity.userId && finishedActivity.userId !== user.uid) return;
    savingRef.current = true;
    setSaveState('saving');
    try {
      activityIdRef.current ??= createActivityId(user.uid);
      await saveActivity({
        activityId: activityIdRef.current,
        dateKey: finishedDateRef.current,
        activityType: 'walk',
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
    } finally {
      savingRef.current = false;
    }
  };

  const primaryLabel = tracking.status === 'tracking' ? 'Pause' : tracking.status === 'paused' ? tracking.canResume ? 'Resume' : 'Review & save' : tracking.status === 'finished' ? 'New walk' : 'Start';

  const discardActivity = () => {
    if (savingRef.current) return;
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
    <ActivityMap currentLocation={tracking.currentLocation} fallback={<View style={styles.mapFallback}><Text style={styles.mapFallbackText}>Route maps are available in the mobile app.</Text></View>} initialRegion={defaultRegion} route={tracking.route} showsUserLocation style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[styles.topOverlay, { top: insets.top + 12 }]}>
      <Text style={styles.eyebrow}>RECORD WALK</Text>
      <Text style={styles.title}>{activityTitle}</Text>
      <Text style={styles.status}>{saveState === 'saving' ? 'Saving your walk…' : saveState === 'saved' ? 'Saved to your history.' : saveState === 'error' ? 'We could not save this walk.' : tracking.isRestoring ? 'Restoring your walk…' : tracking.isPreparing ? 'Connecting to GPS…' : tracking.backgroundIssue === 'storage' ? 'We could not keep a local recovery copy. Recording is paused; finish your walk to keep what was saved.' : tracking.backgroundIssue === 'stop' ? 'Recording is paused, but the location service did not stop. Retry stopping below.' : tracking.backgroundIssue === 'unavailable' ? 'Background recording needs an updated native build of Stride Circle.' : tracking.backgroundIssue === 'permission' ? 'Allow background location in Settings to record with your phone locked.' : tracking.pauseReason === 'recovered' ? 'Your earlier walk was recovered. Resume or finish when ready.' : tracking.pauseReason === 'background' ? 'Your walk paused when the app went to the background. Resume when ready.' : tracking.pauseReason === 'gps-error' ? 'GPS was interrupted. Your recorded progress is kept.' : statusMessage(tracking.status, tracking.gpsSignal, tracking.accuracyMeters)}</Text>
    </View>
    <View style={[styles.metricCard, { bottom: sheetHeight + 12 }]}>
      <Text style={styles.trackerType}>WALK</Text>
      <View style={styles.metrics}>
        <Metric styles={styles} value={formatDuration(tracking.elapsedMs)} label="TIME" />
        <Metric styles={styles} value={formatPace(averagePace)} label="AVG. PACE /KM" />
        <Metric styles={styles} value={(tracking.distanceMeters / 1_000).toFixed(2)} label="DISTANCE KM" />
      </View>
      {tracking.status === 'tracking' ? <Text style={styles.livePace}>Live pace {formatPace(tracking.currentPaceSecondsPerKm)} /km</Text> : null}
    </View>
    <View onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 22) }]}>
      <View style={styles.grabber} />
      <View style={styles.controls}>
        <View accessibilityLabel="Walking activity" style={styles.activityButton}>
          <View style={styles.activitySymbol}><MaterialCommunityIcons color={colors.accent} name="walk" size={27} /></View><Text style={styles.activityButtonLabel}>Walk</Text><Text style={styles.activityButtonHint}>Walking only</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: tracking.isPreparing }} disabled={tracking.isPreparing} onPress={primaryAction} style={({ pressed }) => [styles.startControl, tracking.isPreparing && styles.disabled, pressed && styles.pressed]}><View style={styles.startButton}><Ionicons color={colors.onAccent} name={tracking.status === 'tracking' ? 'pause' : 'play'} size={25} /></View><Text style={styles.startText}>{tracking.isPreparing ? 'Connecting…' : primaryLabel}</Text></Pressable>
        {isMoving ? <Pressable accessibilityRole="button" disabled={isFinishing} onPress={() => void finishActivity()} style={({ pressed }) => [styles.finishButton, (pressed || isFinishing) && styles.pressed]}><View style={styles.finishIcon}><Ionicons color={colors.ink} name="stop" size={16} /></View><Text style={styles.finishText}>{isFinishing ? 'Finishing…' : 'Finish'}</Text></Pressable> : <View style={styles.finishPlaceholder} />}
      </View>
      {tracking.backgroundIssue === 'stop' ? <View style={styles.recovery}><Text style={styles.permissionMessage}>Open the app and retry stopping the location service.</Text><Pressable accessibilityRole="button" onPress={tracking.retryStop} style={styles.settingsButton}><Text style={styles.settingsButtonText}>Retry stopping</Text></Pressable></View> : tracking.status === 'denied' || (tracking.status === 'paused' && tracking.gpsSignal === 'disabled') ? <View style={styles.recovery}><Text style={styles.permissionMessage}>Location access is off. Allow background location in Settings to keep recording with your phone locked.</Text><Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}><Text style={styles.settingsButtonText}>Open Settings</Text></Pressable></View> : tracking.gpsSignal === 'disabled' ? <Text style={styles.permissionMessage}>Location Services are turned off. Turn them on in Settings, then try again.</Text> : tracking.status === 'error' ? <Text style={styles.permissionMessage}>We could not start GPS. Check your location settings and try again.</Text> : tracking.gpsSignal === 'weak' && tracking.status === 'tracking' ? <View style={styles.weakSignal}><Ionicons color="#9A3412" name="location-outline" size={17} /><Text style={styles.weakSignalText}>Weak GPS signal. Your time continues, but route distance pauses until accuracy improves.</Text></View> : <Text style={styles.note}>{process.env.EXPO_OS === 'web' ? 'Browser recording pauses when you leave. Use the mobile app for locked-screen recording.' : 'Your active walk keeps recording with the phone locked. Pause or finish to stop recording.'}</Text>}
    </View>
    {finishedActivity ? <ActivitySummarySheet distanceMeters={finishedActivity.distanceMeters} durationMs={finishedActivity.durationMs} isSaving={saveState === 'saving'} onDiscard={discardActivity} onSave={() => void saveFinishedActivity()} saveError={saveState === 'error'} visible={isSummaryVisible} /> : null}
    <CelebrationSheet
      body={`${((finishedActivity?.distanceMeters ?? 0) / 1_000).toFixed(2)} km in ${formatDuration(finishedActivity?.durationMs ?? 0)}. Your walk is saved in History.`}
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
  if (status === 'finished') return 'Your walk is ready to save next.';
  return 'Start your walk when you are ready.';
}

function Metric({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 }, mapFallback: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }, mapFallbackText: { color: colors.muted, fontSize: 15 }, topOverlay: { backgroundColor: colors.card, borderBottomWidth: 3, borderColor: colors.border, borderRadius: 18, borderWidth: 2, left: 18, padding: 15, position: 'absolute', right: 18 }, eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 }, status: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 }, metricCard: { backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 22, borderWidth: 2, left: 18, padding: 20, position: 'absolute', right: 18 }, trackerType: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 17, textAlign: 'center' }, metrics: { flexDirection: 'row' }, metric: { alignItems: 'center', flex: 1 }, metricValue: { color: colors.ink, fontSize: 23, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.8 }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.45, marginTop: 5 }, livePace: { color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 16, textAlign: 'center' }, sheet: { backgroundColor: colors.card, borderColor: colors.border, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 2, bottom: 0, left: 0, paddingHorizontal: 22, paddingTop: 10, position: 'absolute', right: 0 }, grabber: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 2, height: 4, width: 38 }, controls: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, activityButton: { alignItems: 'center', minWidth: 78 }, disabled: { opacity: 0.55 }, activitySymbol: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 27, height: 54, justifyContent: 'center', width: 54 }, activityButtonLabel: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 6 }, activityButtonHint: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 2 }, startControl: { alignItems: 'center', minWidth: 78 }, startButton: { alignItems: 'center', backgroundColor: colors.accent, borderBottomWidth: 4, borderColor: colors.brandActionPressed, borderRadius: 34, borderWidth: 2, height: 68, justifyContent: 'center', width: 68 }, startText: { color: colors.accent, fontSize: 14, fontWeight: '900', marginTop: 7 }, finishButton: { alignItems: 'center', minWidth: 78 }, finishIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 27, height: 54, justifyContent: 'center', width: 54 }, finishText: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 6 }, finishPlaceholder: { minWidth: 78 }, recovery: { alignItems: 'center', marginTop: 10 }, permissionMessage: { color: colors.dangerContent, fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' }, settingsButton: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 12, justifyContent: 'center', marginTop: 9, minHeight: 38, paddingHorizontal: 14 }, settingsButtonText: { color: colors.accentPressed, fontSize: 13, fontWeight: '900' }, weakSignal: { alignItems: 'center', backgroundColor: colors.warningSurface, borderRadius: 12, flexDirection: 'row', gap: 7, marginTop: 12, padding: 10 }, weakSignalText: { color: colors.warningContent, flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 15 }, note: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 14, textAlign: 'center' }, pressed: { opacity: 0.84, transform: [{ translateY: 2 }] },
}); }
