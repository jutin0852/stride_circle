import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { AppSheet, AppText, Button, IconButton } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { averagePace, formatWalkPace, formatWalkTime } from '@/domain/walk';
import { useActivityTracking } from '@/hooks/use-activity-tracking';
import { useForegroundLocation } from '@/hooks/use-foreground-location';
import { useWalks } from '@/hooks/use-walks';
import { getBackgroundRecording } from '@/lib/background-activity';
import { finishRecording, newRecording } from '@/lib/activity-recording';
import { activityFromSession, getWalk, saveLocalWalk, syncPendingWalks } from '@/services/walks/repository';
import { matchWalkingRoute } from '@/services/maps/mapbox';
import { simplifyRoute, splitRoute } from '@/lib/route';
import { WalkControl } from './walk-control';

async function snapSavedWalkRoute(activity: ReturnType<typeof activityFromSession>) {
  const route = simplifyRoute(activity.displayCoordinates, 100);
  if (!splitRoute(route).some(segment => segment.length > 1)) return;
  try {
    const correctedRoute = await matchWalkingRoute(route);
    if (correctedRoute === route) return;
    const latest = await getWalk(activity.userId, activity.id);
    if (!latest) return;
    await saveLocalWalk({ ...latest, displayCoordinates: correctedRoute, updatedAt: Date.now(), syncStatus: 'pending' });
    try {
      await syncPendingWalks(activity.userId);
      const saved = await getWalk(activity.userId, activity.id);
      if (saved?.syncStatus === 'pending') await syncPendingWalks(activity.userId);
    } catch {
      // The locally saved route remains available and will sync on a later retry.
    }
  } catch {
    // Route correction is best-effort; the original GPS route has already been saved.
  }
}

export function WalkRecorder({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const tracking = useActivityTracking(user?.uid);
  const location = useForegroundLocation(embedded);
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const walks = useWalks(user?.uid);
  const plan = walks.routes.find(r => r.id === (tracking.plannedRouteId ?? routeId));
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [finishPrompt, setFinishPrompt] = useState<'choices' | 'confirm-discard' | null>(null);
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
      if (getBackgroundRecording().issue === 'stop') throw new Error('Location could not be stopped. Retry stopping it before saving or discarding this walk.');
      const activity = activityFromSession(session);
      await saveLocalWalk(activity);
      void snapSavedWalkRoute(activity);
      tracking.reset();
      void syncPendingWalks(user.uid).catch(() => {});
      if (embedded) router.push({ pathname: '/walk/[id]', params: { id: session.id } });
      else router.replace({ pathname: '/walk/[id]', params: { id: session.id } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Save failed. Your walk is preserved; try again.'); }
    finally { lock.current = false; setSaving(false); }
  }
  async function discard() {
    if (!user || lock.current) return;
    lock.current = true; setDiscarding(true); setError(null);
    try {
      await tracking.discard();
      setFinishPrompt(null);
      if (!embedded) router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The walk could not be discarded. Your recording is preserved; try again.');
    } finally { lock.current = false; setDiscarding(false); }
  }
  const active = tracking.status === 'tracking';
  const paused = tracking.status === 'paused';
  const finished = tracking.status === 'finished';
  const hasWalkSession = active || paused || finished;
  const displayedSteps = tracking.steps ?? (hasWalkSession ? null : 0);
  return <View style={[styles.page, { backgroundColor: colors.background }]}>
    <View style={styles.map}><ActivityMap currentLocation={tracking.currentLocation ?? location.point} route={tracking.route} plannedRoute={plan?.coordinates} showsUserLocation style={StyleSheet.absoluteFill} /></View>
    <View style={[styles.heading, { top: insets.top + 8, backgroundColor: colors.card, borderColor: colors.border }]}>
      {!embedded ? <IconButton accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></IconButton> : null}
      <View style={styles.fill}><AppText variant="titleSmall">{active ? 'Recording your walk' : paused ? 'Walk paused' : finished ? 'Ready to save' : tracking.isRestoring ? 'Restoring your walk' : 'Ready to walk'}</AppText><AppText variant="caption">{plan?.name ?? (tracking.gpsSignal === 'weak' ? 'Weak GPS · route distance is paused' : tracking.isRestoring ? 'Restoring your walk' : tracking.locationMode === 'foreground' ? 'Foreground only · locking pauses recording' : 'Your route stays private')}</AppText></View>
      {!active && !paused && !finished ? <Button size="small" variant="tertiary" accessibilityLabel="Add or plan a route" accessibilityHint="Choose or create a walking route before you start." disabled={tracking.isPreparing} onPress={() => router.push('/walk/plan')} trailing={<Ionicons name="add" size={18} color={colors.ink} />}>Routes</Button> : null}
    </View>
    <ScrollView style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]} contentContainerStyle={{ padding: 20, paddingBottom: 12, gap: 12 }} showsVerticalScrollIndicator={false}>
      <View style={styles.stats}>
        <Stat label="Steps" value={displayedSteps === null ? 'Unavailable' : displayedSteps.toLocaleString()} />
        <Stat label="Distance" value={`${(tracking.distanceMeters / 1000).toFixed(2)} km`} />
        <Stat label="Active time" value={formatWalkTime(tracking.elapsedMs / 1000)} />
        <Stat label="Average pace" value={formatWalkPace(averagePace(tracking.elapsedMs / 1000, tracking.distanceMeters))} />
      </View>
      {!tracking.currentLocation && location.status === 'loading' ? <View style={[styles.locationNotice, { backgroundColor: colors.infoSurface, borderColor: colors.border }]}><ActivityIndicator color={colors.accent} /><AppText tone="secondary">Finding your location to center the map…</AppText></View> : null}
      {!tracking.currentLocation && (location.status === 'denied' || location.status === 'services-disabled') ? <View style={[styles.locationNotice, { backgroundColor: colors.infoSurface, borderColor: colors.border }]}>
        <AppText variant="label">Show your location on the map</AppText>
        <AppText tone="secondary">Allow location while using the app to center the map. Your location stays private and is only saved with a walk you choose to finish.</AppText>
        <Button variant="tertiary" onPress={() => {
          if (location.status === 'services-disabled' || location.status === 'denied' && !location.canAskAgain) void location.openSettings();
          else void location.refresh(true);
        }}>{location.status === 'services-disabled' || !location.canAskAgain ? 'Open location settings' : 'Enable location'}</Button>
      </View> : null}
      {!tracking.currentLocation && (location.status === 'error' || location.status === 'unsupported') ? <View style={[styles.locationNotice, { backgroundColor: colors.infoSurface, borderColor: colors.border }]}>
        <AppText variant="label">Your location is unavailable</AppText>
        <AppText tone="secondary">{location.status === 'unsupported' ? 'Live GPS maps are available in the mobile app.' : 'We could not find your location. Try again or continue without a centered map.'}</AppText>
        {location.status === 'error' ? <Button variant="tertiary" onPress={() => void location.refresh(true)}>Try location again</Button> : null}
      </View> : null}
      {tracking.pauseReason === 'recovered' ? <AppText accessibilityRole="alert">Your interrupted walk was recovered. Resume or save it.</AppText> : null}
      {tracking.steps === null && (active || paused || finished) ? <AppText tone="secondary">Your phone hasn’t provided step data for this walk—this is not a zero-step result. GPS route and distance still record. If Motion & Fitness or Health access was denied, check the permissions in Settings.</AppText> : null}
      {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
      {tracking.backgroundIssue === 'storage' ? <AppText accessibilityRole="alert" tone="danger">Recording paused because your phone could not save progress. Check available storage, then retry. Your last saved recording is preserved.</AppText> : null}
      {tracking.backgroundIssue === 'stop' ? <Button variant="danger" onPress={tracking.retryStop}>Retry stopping location</Button> : null}
      {tracking.status === 'denied' && location.status !== 'denied' ? <><AppText tone="danger">Location access is denied. Allow access in phone Settings to record a route.</AppText><Button variant="tertiary" onPress={() => void Linking.openSettings()}>Open Settings</Button></> : null}
      {tracking.status === 'error' ? <AppText accessibilityRole="alert" tone="danger">GPS could not start. Check Location Services and try again.</AppText> : null}
    </ScrollView>
    <View testID="walk-action-dock" style={[styles.actionDock, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.controls}>
        {!finished && !active && !paused ? <View style={styles.startAction}>
          <WalkControl label="Start a walk" icon="walk-outline" circular disabled={saving || discarding || tracking.isPreparing || tracking.isRestoring} loading={tracking.isPreparing || tracking.isRestoring} onPress={() => void tracking.start('walk', plan?.id)} />
          <AppText variant="caption">Start</AppText>
        </View> : !finished ? <WalkControl label={active ? 'Pause walk' : 'Resume walk'} icon={active ? 'pause' : 'play'} disabled={saving || discarding || tracking.isPreparing} loading={tracking.isPreparing} onPress={() => { if (active) tracking.pause(); else if (paused) void tracking.resume(); }} /> : null}
        {active || paused || finished ? <WalkControl label="Finish" icon="stop-outline" secondary disabled={discarding || saving} loading={saving} onPress={() => {
          setError(null);
          setFinishPrompt('choices');
        }} /> : null}
      </View>
    </View>
    <AppSheet accessibilityLabel={finishPrompt === 'confirm-discard' ? 'Discard walk confirmation' : 'Finish walk options'} visible={finishPrompt !== null} onClose={() => {
      if (!saving && !discarding) setFinishPrompt(null);
    }}>
      <View style={styles.finishSheet}>
        <AppText variant="titleSmall">{finishPrompt === 'confirm-discard' ? 'Discard this walk?' : 'Finish this walk?'}</AppText>
        <AppText tone="secondary">{finishPrompt === 'confirm-discard' ? 'Are you sure? This walk and its recorded route will be permanently removed.' : 'Keep walking, save it privately to History, or discard it. Nothing is saved until you choose.'}</AppText>
        {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
        {finishPrompt === 'confirm-discard' ? <>
          <Button variant="tertiary" disabled={saving || discarding} onPress={() => setFinishPrompt('choices')}>Cancel</Button>
          <Button variant="danger" disabled={saving} loading={discarding} onPress={() => void discard()}>Yes, discard walk</Button>
        </> : <>
          <Button variant="tertiary" disabled={saving || discarding} onPress={() => setFinishPrompt(null)}>Keep walking</Button>
          <Button disabled={discarding} loading={saving} onPress={() => {
            setFinishPrompt(null);
            void finish();
          }}>Finish &amp; save</Button>
          <Button variant="danger" disabled={saving} loading={discarding} onPress={() => setFinishPrompt('confirm-discard')}>Discard walk</Button>
        </>}
      </View>
    </AppSheet>
  </View>;
}
export function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}><AppText variant="stat" style={{ fontSize: 22, lineHeight: 28 }}>{value}</AppText><AppText variant="caption">{label}</AppText></View>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, map: { flex: 1, minHeight: 180 }, heading: { position: 'absolute', left: 16, right: 16, padding: 8, flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 2, borderBottomWidth: 4, borderRadius: 8 }, fill: { flex: 1, minWidth: 0 }, panel: { flexGrow: 0, maxHeight: '48%', borderTopWidth: 2 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { width: '46%', minWidth: 120, gap: 3 }, locationNotice: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 }, actionDock: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 }, controls: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 }, startAction: { alignItems: 'center', gap: 3 }, walkButton: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' }, walkPressed: { opacity: 0.78, transform: [{ scale: 0.97 }] }, walkDisabled: { opacity: 0.55 }, finishSheet: { gap: 12, paddingBottom: 8 } });
