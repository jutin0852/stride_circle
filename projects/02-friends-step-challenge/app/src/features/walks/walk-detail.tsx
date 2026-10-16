import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { AppSheet, AppText, Button, FixedHeaderScreen, IconButton } from '@/components/ui';
import { useAppColors, useAppTheme } from '@/design-system/use-app-theme';
import { defaultRoutePrivacy, formatWalkTime, shareableWalk as createShareableWalk, type WalkActivity } from '@/domain/walk';
import { splitRoute } from '@/lib/route';
import { deleteWalk, getWalk, saveLocalWalk, subscribeWalks, syncPendingWalks } from '@/services/walks/repository';
import { shareWalkImage } from '@/services/walks/share';
import { mapboxToken, staticWalkMapUrl } from '@/services/maps/mapbox';
import { WalkShareCard } from './share-card';
import { Stat } from './walk-recorder';

function shareableWalk(activity: WalkActivity) {
  return createShareableWalk({
    ...activity,
    privacy: {
      ...activity.privacy,
      hideStartEnd: true,
      radiusMeters: Math.max(activity.privacy.radiusMeters, defaultRoutePrivacy.radiusMeters),
    },
  });
}

function routeEmptyMessage(activity: WalkActivity) {
  if (activity.privacy.hideMap) return 'Route map is turned off for sharing.';
  if (activity.displayCoordinates.length < 2) return 'No GPS route was recorded for this walk.';
  if (!splitRoute(shareableWalk(activity).route).some(segment => segment.length > 1)) return 'This walk is too short to show while keeping the start and finish private.';
  return 'No shareable route is available for this walk.';
}

function hasShareableRoute(route: WalkActivity['displayCoordinates']) {
  return splitRoute(route).some(segment => segment.length > 1);
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/history');
}

export function WalkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useAppColors(); const { isDark } = useAppTheme(); const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [activity, setActivity] = useState<WalkActivity | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [sharing, setSharing] = useState(false); const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveLock = useRef(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);
  const shareSession = useRef(0);
  const pickerBusy = useRef(false);
  const shareRequest = useRef<AbortController | null>(null);
  const shareButton = useRef<View>(null);
  const closeShareButton = useRef<View>(null);
  const [showMapDetails, setShowMapDetails] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [mapUri, setMapUri] = useState<string | null>(null); const [mapReady, setMapReady] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const capture = useRef<View>(null);
  const blurTarget = useRef<View>(null);
  const previewHeight = Math.min(480, Math.max(250, height * 0.58));
  const previewWidth = Math.min(width - 48, previewHeight * 9 / 16);
  useEffect(() => () => shareRequest.current?.abort(), []);

  function closeShare() {
    shareSession.current += 1;
    shareRequest.current?.abort();
    shareRequest.current = null;
    setShareBusy(false);
    setSharing(false);
  }

  async function choosePhoto() {
    if (pickerBusy.current || shareBusy) return;
    const session = shareSession.current;
    pickerBusy.current = true; setPhotoBusy(true); setShareNotice(null);
    try {
      // Load on demand so clients without the new native picker keep working.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const picker = require('expo-image-picker') as typeof import('expo-image-picker');
      const result = await picker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85, exif: false });
      if (session !== shareSession.current || result.canceled) return;
      const uri = result.assets[0]?.uri;
      if (uri && uri !== photoUri) { setPhotoReady(false); setPhotoUri(uri); }
    } catch {
      if (session === shareSession.current) setShareNotice('Photos could not open. Try again or use the route view.');
    } finally { pickerBusy.current = false; setPhotoBusy(false); }
  }

  useEffect(() => {
    if (!photoUri || photoReady) return;
    const timeout = setTimeout(() => { setPhotoUri(null); setPhotoReady(true); setShareNotice('Photo could not load. Try another photo.'); }, 8000);
    return () => clearTimeout(timeout);
  }, [photoReady, photoUri]);

  async function share() {
    if (shareRequest.current || !activity) return;
    const request = new AbortController();
    shareRequest.current = request;
    setShareBusy(true); setError(null);
    try { await shareWalkImage(capture, shareableWalk(activity), true, request.signal); }
    catch { if (!request.signal.aborted) setError('Sharing could not open. Try again.'); }
    finally {
      if (shareRequest.current === request) {
        shareRequest.current = null;
        setShareBusy(false);
      }
    }
  }

  useEffect(() => {
    if (!sharing || photoUri || mapReady || !mapUri) return;
    const timeout = setTimeout(() => {
      setMapUri(null); setMapReady(true); setShowMapDetails(false);
      setShareNotice('Map details took too long to load. The privacy-safe route preview is ready to share.');
    }, 8000);
    return () => clearTimeout(timeout);
  }, [mapReady, mapUri, photoUri, sharing]);

  useEffect(() => {
    let active = true;
    if (!user || !id) return;
    const key = `${user.uid}:${id}`;
    void getWalk(user.uid, id).then(a => { if (active) { setActivity(a); setTitle(a?.title ?? ''); setNotes(a?.notes ?? ''); setLoadedKey(key); setLoading(false); } }).catch(() => { if (active) { setActivity(null); setError('Walk could not load. Check your connection.'); setLoadedKey(key); setLoading(false); } });
    return () => { active = false; };
  }, [user, id]);

  useEffect(() => {
    if (!user || !id) return;
    let active = true;
    const unsubscribe = subscribeWalks(() => {
      void getWalk(user.uid, id).then(saved => { if (active && saved) setActivity(saved); }).catch(() => {});
    });
    return () => { active = false; unsubscribe(); };
  }, [user?.uid, id]);

  async function update(next: WalkActivity, confirmSave = false) {
    if (saveLock.current) return;
    saveLock.current = true;
    setBusy(true); setError(null); setSaved(false);
    setMapUri(null); setMapReady(true);
    try {
      const saved = { ...next, updatedAt: Date.now(), syncStatus: 'pending' as const };
      await saveLocalWalk(saved);
      setActivity(saved);
      if (confirmSave) { setTitle(saved.title); setSaved(true); }
      void syncPendingWalks(next.userId).catch(() => {});
      if (showMapDetails) {
        const route = shareableWalk(saved).route;
        const uri = hasShareableRoute(route) ? staticWalkMapUrl(route, isDark) : null;
        if (uri) { setMapUri(uri); setMapReady(false); }
        else {
          setShowMapDetails(false); setMapUri(null); setMapReady(true);
          setShareNotice(!hasShareableRoute(route) ? routeEmptyMessage(saved) : 'Street details are unavailable right now. The privacy-safe route preview is still ready to share.');
        }
      }
    } catch { setError('Changes could not save. Try again.'); }
    finally { saveLock.current = false; setBusy(false); }
  }

  async function removeWalk() {
    if (!activity || deleting) return;
    setDeleting(true); setError(null);
    try {
      await deleteWalk(activity.userId, activity.id);
      router.replace('/history');
    } catch {
      setError('This walk could not be deleted. Check your connection and try again.');
    } finally {
      setDeleting(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete saved walk?', 'This removes the walk from your private History and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete walk', style: 'destructive', onPress: () => { void removeWalk(); } },
    ]);
  }

  function openShare() {
    shareSession.current += 1;
    setError(null); setShareNotice(null); setSharing(true);
  }

  function toggleMapDetails(value: boolean) {
    setShareNotice(null);
    if (!value) { setShowMapDetails(false); setMapUri(null); setMapReady(true); return; }
    if (!activity) return;
    if (!hasShareableRoute(shared.route)) { setShowMapDetails(false); setMapUri(null); setMapReady(true); setShareNotice(routeEmptyMessage(activity)); return; }
    if (!mapboxToken()) { setShowMapDetails(false); setMapUri(null); setMapReady(true); setShareNotice('Street details are unavailable right now. The privacy-safe route preview is still ready to share.'); return; }
    const uri = staticWalkMapUrl(shared.route, isDark);
    if (!uri) {
      setShowMapDetails(false);
      setMapUri(null); setMapReady(true);
      setShareNotice('Street details are unavailable right now. The privacy-safe route preview is still ready to share.');
      return;
    }
    setShowMapDetails(true); setMapUri(uri); setMapReady(false);
  }

  if (loading || loadedKey !== `${user?.uid}:${id}`) return <View style={[styles.empty, { backgroundColor: colors.background }]}><AppText>Loading walk…</AppText></View>;
  if (!activity) return <View style={[styles.empty, { backgroundColor: colors.background }]}><AppText>{error ?? 'This walk uses an earlier activity format.'}</AppText><Button onPress={() => router.replace({ pathname: '/activity/[activityId]', params: { activityId: id } })}>Open activity summary</Button><Button variant="tertiary" onPress={goBack}>Go back</Button></View>;
  const shared = shareableWalk(activity);
  const hasChanges = title.trim() !== activity.title || notes !== activity.notes;
  const canShowMapDetails = !!mapboxToken() && !activity.privacy.hideMap && hasShareableRoute(shared.route);
  const mapDetailsHint = !mapboxToken()
    ? 'Street names are unavailable right now. The route-only preview is still ready to share.'
    : activity.privacy.hideMap
      ? 'Turn on Include route map before adding street names.'
      : !hasShareableRoute(shared.route)
        ? routeEmptyMessage(activity)
        : 'Off by default; street names can reveal the area around your route.';

  return <>
    <BlurTargetView ref={blurTarget} style={styles.screen}>
      <FixedHeaderScreen backgroundColor={colors.background} header={<View style={styles.header}><IconButton accessibilityLabel="Back" onPress={goBack}><Ionicons name="arrow-back" color={colors.ink} size={22} /></IconButton><AppText variant="headline" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{activity.title}</AppText><IconButton ref={shareButton} accessibilityLabel="Share walk" disabled={busy} onPress={openShare} style={styles.headerShare}><Ionicons name="share-outline" color={colors.ink} size={21} /></IconButton></View>} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        <AppText style={{ paddingHorizontal: 20 }} variant="caption">{new Date(activity.startedAt).toLocaleDateString()}</AppText>
        {activity.displayCoordinates.length ? <ActivityMap route={activity.displayCoordinates} fitRoute style={styles.map} /> : <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft, padding: 24 }]}><AppText variant="label" style={{ textAlign: 'center' }}>No GPS route was recorded</AppText><AppText tone="secondary" variant="caption" style={{ textAlign: 'center' }}>The route appears after GPS records accurate movement. A short or stationary test may have no path.</AppText></View>}
        <View style={styles.content}>
          <View style={styles.stats}>{activity.steps !== null ? <Stat label="Steps" value={activity.steps.toLocaleString()} /> : null}<Stat label="Distance" value={`${(activity.distanceMeters / 1000).toFixed(2)} km`} /><Stat label="Walking time" value={formatWalkTime(activity.durationSeconds)} /></View>
          <TextInput accessibilityLabel="Activity title" editable={!busy} value={title} onChangeText={value => { setTitle(value); setSaved(false); }} maxLength={80} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
          <TextInput accessibilityLabel="Private activity notes" editable={!busy} placeholder="Private notes" placeholderTextColor={colors.muted} value={notes} onChangeText={value => { setNotes(value); setSaved(false); }} multiline maxLength={2000} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
          <Button loading={busy} disabled={busy || deleting || !title.trim() || !hasChanges} onPress={() => { void update({ ...activity, title: title.trim(), notes }, true); }}>Save changes</Button>
          {saved ? <View style={styles.savedFeedback}><Ionicons name="checkmark-circle" color={colors.success} size={18} /><AppText accessibilityLiveRegion="polite" tone="success" variant="label">Saved</AppText></View> : null}
          <Button variant="danger" loading={deleting} disabled={busy || deleting} onPress={confirmDelete}>Delete saved walk</Button>
          <View testID="walk-sharing-options" style={styles.shareSettings}>
            <AppText variant="label">Sharing</AppText>
            <View style={[styles.shareOption, { borderColor: colors.border }]}>
              <View style={styles.optionCopy}><AppText variant="label">Include route map</AppText><AppText variant="caption" tone="secondary">Start and finish stay private.</AppText></View>
              <Switch accessibilityLabel="Include route map" disabled={busy || shareBusy} value={!activity.privacy.hideMap} onValueChange={value => { void update({ ...activity, privacy: { ...activity.privacy, hideMap: !value } }); }} />
            </View>
            <View style={[styles.shareOption, { borderColor: colors.border }]}>
              <View style={styles.optionCopy}><AppText variant="label">Show streets and place labels</AppText><AppText variant="caption" tone="secondary">{mapDetailsHint}</AppText></View>
              <Switch accessibilityLabel="Show streets and place labels" disabled={busy || shareBusy || !canShowMapDetails} value={showMapDetails} onValueChange={toggleMapDetails} />
            </View>
            {!sharing && shareNotice ? <AppText accessibilityRole="alert" variant="caption" tone="secondary">{shareNotice}</AppText> : null}
          </View>
          {!sharing && error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
        </View>
      </FixedHeaderScreen>
    </BlurTargetView>

    <AppSheet accessibilityLabel="Share this walk" closeAccessibilityLabel="Dismiss share preview" initialFocusRef={closeShareButton} returnFocusRef={shareButton} onClose={closeShare} swipeToDismiss visible={sharing} sheetStyle={styles.shareSheet} contentStyle={styles.shareBody}
      backdropContent={<BlurView blurTarget={blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={36} tint={isDark ? 'dark' : 'light'} pointerEvents="none" style={StyleSheet.absoluteFill} />}>
          <ScrollView testID="walk-share-overlay-content" style={styles.shareBody} contentContainerStyle={styles.shareContent} showsVerticalScrollIndicator={false}>
            <View style={styles.shareHeader}>
              <View style={styles.shareHeaderCopy}><AppText accessibilityRole="header" variant="titleSmall">Share this walk</AppText></View>
              <IconButton ref={closeShareButton} accessibilityLabel="Close share preview" onPress={closeShare}><Ionicons name="close" color={colors.ink} size={22} /></IconButton>
            </View>

            <View ref={capture} collapsable={false} style={[styles.preview, { width: previewWidth }]}>
              <WalkShareCard walk={shared} story mapUri={photoUri ? null : mapUri} photoUri={photoUri} onPhotoReady={() => setPhotoReady(true)} onPhotoError={() => { setPhotoUri(null); setPhotoReady(true); setShareNotice('Photo could not load. Try another photo.'); }} routeEmptyMessage={routeEmptyMessage(activity)} onMapReady={() => setMapReady(true)} onMapError={() => { setMapUri(null); setMapReady(true); setShowMapDetails(false); setShareNotice('Street details could not load. The privacy-safe route preview is ready to share.'); }} />
            </View>
            {!photoUri && mapUri && !mapReady ? <View style={styles.mapLoading}><ActivityIndicator color={colors.accent} size="small" /><AppText variant="caption" tone="secondary">Loading map…</AppText><Pressable accessibilityRole="button" onPress={() => toggleMapDetails(false)}><AppText variant="caption" tone="link">Use route view</AppText></Pressable></View> : null}

            <View style={styles.photoActions}>
              <Button size="small" variant="tertiary" loading={photoBusy} disabled={shareBusy || photoBusy} onPress={() => void choosePhoto()}>{photoUri ? 'Change photo' : 'Add photo'}</Button>
              {photoUri ? <Button size="small" variant="tertiary" disabled={shareBusy || photoBusy} onPress={() => { setPhotoUri(null); setPhotoReady(true); setShareNotice(null); }}>Use route</Button> : null}
            </View>
            {shareNotice ? <AppText accessibilityRole="alert" variant="caption" tone="secondary">{shareNotice}</AppText> : null}
            {error ? <AppText accessibilityRole="alert" variant="caption" tone="danger">{error}</AppText> : null}
            <Button loading={shareBusy} disabled={busy || shareBusy || photoBusy || (photoUri ? !photoReady : !mapReady)} onPress={() => void share()}>Share</Button>
          </ScrollView>
    </AppSheet>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  headerShare: { borderWidth: 0 },
  map: { width: '100%', height: 300, marginTop: 16 },
  content: { padding: 20, gap: 16 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, minHeight: 48, padding: 12, fontSize: 16 },
  empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  shareSheet: { maxHeight: '94%', paddingHorizontal: 20, paddingTop: 12 },
  shareContent: { gap: 12, paddingBottom: 8 },
  shareBody: { flexShrink: 1 },
  shareHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareHeaderCopy: { flex: 1, gap: 2 },
  preview: { alignSelf: 'center' },
  mapLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  shareOption: { minHeight: 60, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionCopy: { flex: 1, gap: 3 },
  savedFeedback: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  shareSettings: { gap: 10, marginTop: 8 },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
});
