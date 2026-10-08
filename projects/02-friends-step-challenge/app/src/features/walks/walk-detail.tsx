import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { AppText, Button, IconButton, SegmentedControl } from '@/components/ui';
import { useAppColors, useAppTheme } from '@/design-system/use-app-theme';
import { formatWalkPace, formatWalkTime, shareableWalk, type WalkActivity } from '@/domain/walk';
import { getWalk, saveLocalWalk, syncPendingWalks } from '@/services/walks/repository';
import { shareWalkImage } from '@/services/walks/share';
import { matchWalkingRoute, staticWalkMapUrl } from '@/services/maps/mapbox';
import { WalkShareCard } from './share-card';
import { Stat } from './walk-recorder';

export function WalkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useAppColors(); const { isDark } = useAppTheme(); const insets = useSafeAreaInsets();
  const [activity, setActivity] = useState<WalkActivity | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [sharing, setSharing] = useState(false); const [busy, setBusy] = useState(false);
  const [story, setStory] = useState(true); const [mapUri, setMapUri] = useState<string | null>(null); const [mapReady, setMapReady] = useState(true);
  const [radius, setRadius] = useState('200'); const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const capture = useRef<View>(null);
  useEffect(() => {
    if (mapReady || !mapUri) return;
    const timeout = setTimeout(() => { setMapUri(null); setMapReady(true); }, 12000);
    return () => clearTimeout(timeout);
  }, [mapReady, mapUri]);
  useEffect(() => {
    let active = true;
    if (!user || !id) return;
    const key = `${user.uid}:${id}`;
    void getWalk(user.uid, id).then(a => { if (active) { setActivity(a); setTitle(a?.title ?? ''); setNotes(a?.notes ?? ''); setRadius(String(a?.privacy.radiusMeters ?? 200)); setLoadedKey(key); setLoading(false); } }).catch(() => { if (active) { setActivity(null); setError('Walk could not load. Check your connection.'); setLoadedKey(key); setLoading(false); } });
    return () => { active = false; };
  }, [user, id]);
  async function update(next: WalkActivity) {
    setBusy(true); setError(null); setSharing(false); setMapUri(null); setMapReady(true);
    try { const saved = { ...next, updatedAt: Date.now(), syncStatus: 'pending' as const }; await saveLocalWalk(saved); setActivity(saved); void syncPendingWalks(next.userId).catch(() => {}); }
    catch { setError('Changes could not save. Try again.'); }
    finally { setBusy(false); }
  }
  if (loading || loadedKey !== `${user?.uid}:${id}`) return <View style={[styles.empty, { backgroundColor: colors.background }]}><AppText>Loading walk…</AppText></View>;
  if (!activity) return <View style={[styles.empty, { backgroundColor: colors.background }]}><AppText>{error ?? 'This walk uses an earlier activity format.'}</AppText><Button onPress={() => router.replace({ pathname: '/activity/[activityId]', params: { activityId: id } })}>Open activity summary</Button><Button variant="tertiary" onPress={() => router.back()}>Go back</Button></View>;
  const shared = shareableWalk(activity);
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}>
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}><IconButton accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" color={colors.ink} size={22} /></IconButton><AppText variant="headline" style={{ flex: 1 }}>{activity.title}</AppText></View>
    <AppText style={{ paddingHorizontal: 20 }} variant="caption">{new Date(activity.startedAt).toLocaleString()} – {new Date(activity.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</AppText>
    {activity.displayCoordinates.length ? <ActivityMap route={activity.displayCoordinates} fitRoute style={styles.map} /> : <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft }]}><AppText variant="label">No GPS route was recorded</AppText></View>}
    <View style={styles.content}>
      <View style={styles.stats}><Stat label="Steps" value={activity.steps === null ? 'Unavailable' : activity.steps.toLocaleString()} /><Stat label="Distance" value={`${(activity.distanceMeters / 1000).toFixed(2)} km`} /><Stat label="Active time" value={formatWalkTime(activity.durationSeconds)} /><Stat label="Average pace" value={formatWalkPace(activity.averagePaceSecondsPerKm)} /><Stat label="Elapsed time" value={formatWalkTime(activity.elapsedSeconds)} />{activity.movingDurationSeconds !== null ? <Stat label="Moving time (GPS)" value={formatWalkTime(activity.movingDurationSeconds)} /> : null}</View>
      <AppText variant="caption">{activity.syncStatus === 'pending' ? 'Saved on this device · cloud sync pending' : 'Saved privately'}</AppText>
      <TextInput accessibilityLabel="Activity title" value={title} onChangeText={setTitle} maxLength={80} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
      <TextInput accessibilityLabel="Private activity notes" placeholder="Private notes" placeholderTextColor={colors.muted} value={notes} onChangeText={setNotes} multiline maxLength={2000} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
      <Button variant="tertiary" disabled={busy || !title.trim()} onPress={() => { void update({ ...activity, title: title.trim(), notes }); }}>Save details</Button>
      {activity.syncStatus === 'pending' ? <Button variant="tertiary" loading={busy} onPress={() => { setBusy(true); void syncPendingWalks(activity.userId).then(() => getWalk(activity.userId, activity.id)).then(next => { if (next) setActivity(next); }).catch(() => setError('Cloud sync is unavailable. Your walk remains saved on this device.')).finally(() => setBusy(false)); }}>Retry cloud sync</Button> : null}
      <View style={styles.row}><AppText style={{ flex: 1 }}>Hide start and end when sharing</AppText><Switch accessibilityLabel="Hide start and end when sharing" value={activity.privacy.hideStartEnd} disabled={busy} onValueChange={value => {
        if (value) { void update({ ...activity, privacy: { ...activity.privacy, hideStartEnd: true } }); return; }
        Alert.alert('Include your start and end?', 'Your shared map may reveal your home or other private locations.', [{ text: 'Keep hidden', style: 'cancel' }, { text: 'Include endpoints', onPress: () => { void update({ ...activity, privacy: { ...activity.privacy, hideStartEnd: false } }); } }]);
      }} /></View>
      <View style={styles.row}><AppText style={{ flex: 1 }}>Hide shared map</AppText><Switch accessibilityLabel="Hide shared map" value={activity.privacy.hideMap} disabled={busy} onValueChange={value => { void update({ ...activity, privacy: { ...activity.privacy, hideMap: value } }); }} /></View>
      <TextInput accessibilityLabel="Privacy distance in meters" keyboardType="number-pad" value={radius} onChangeText={setRadius} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
      <Button variant="tertiary" disabled={busy || !radius.trim() || !Number.isFinite(Number(radius)) || Number(radius) < 0 || Number(radius) > 5000} onPress={() => { void update({ ...activity, privacy: { ...activity.privacy, radiusMeters: Number(radius) } }); }}>Save privacy distance</Button>
      <Button variant="tertiary" disabled={busy || activity.displayCoordinates.length < 2} onPress={() => {
        setBusy(true);
        void matchWalkingRoute(activity.displayCoordinates).then(displayCoordinates => {
          if (displayCoordinates === activity.displayCoordinates) { setError('Route alignment is unavailable. Your original route is kept.'); return; }
          return update({ ...activity, displayCoordinates });
        }).finally(() => setBusy(false));
      }}>Align route to walking paths</Button>
      <Button trailing={<Ionicons name="share-outline" color={colors.onAccent} size={20} />} onPress={() => {
        setSharing(true); const uri = staticWalkMapUrl(shared.route, isDark); setMapUri(uri); setMapReady(!uri);
      }}>Share walk</Button>
      {sharing ? <>
        <SegmentedControl accessibilityLabel="Share card format" value={story ? 'story' : 'square'} onChange={value => setStory(value === 'story')} items={[{ value: 'story', label: 'Story' }, { value: 'square', label: 'Square' }]} />
        <View ref={capture} collapsable={false}><WalkShareCard walk={shared} story={story} mapUri={mapUri} onMapReady={() => setMapReady(true)} onMapError={() => { setMapUri(null); setMapReady(true); }} /></View>
        <Button loading={busy} disabled={!mapReady} onPress={() => { setBusy(true); void shareWalkImage(capture, shared, story).catch(() => setError('Sharing failed. Try again.')).finally(() => setBusy(false)); }}>Share image</Button>
      </> : null}
      {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }, map: { width: '100%', height: 300, marginTop: 16 }, content: { padding: 20, gap: 16 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, input: { borderWidth: 1, borderRadius: 8, minHeight: 48, padding: 12, fontSize: 16 }, empty: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 } });
