import { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { AppText, Button, IconButton } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { estimatedSteps, formatWalkTime, validCoordinate, type PlannedWalk } from '@/domain/walk';
import { useWalks } from '@/hooks/use-walks';
import type { RoutePoint } from '@/lib/route';
import { MapServiceError, mapboxToken, walkingDirections } from '@/services/maps/mapbox';
import { deletePlannedWalk, savePlannedWalk } from '@/services/walks/repository';

export function WalkPlanner() {
  const { user } = useAuth(); const colors = useAppColors(); const insets = useSafeAreaInsets();
  const saved = useWalks(user?.uid);
  const [waypoints, setWaypoints] = useState<RoutePoint[]>([]);
  const [result, setResult] = useState<Awaited<ReturnType<typeof walkingDirections>> | null>(null);
  const [name, setName] = useState('My walking route');
  const [latitude, setLatitude] = useState(''); const [longitude, setLongitude] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const generation = useRef(0);
  function changeWaypoints(next: RoutePoint[]) { generation.current++; setWaypoints(next); setResult(null); setSelectedId(null); setError(null); }
  function add(point: RoutePoint) {
    if (busy) return;
    if (!validCoordinate(point) || waypoints.length >= 25) { setError('Choose valid coordinates; a route supports up to 25 stops.'); return; }
    changeWaypoints([...waypoints, point]); setLatitude(''); setLongitude('');
  }
  async function setCurrentStart() {
    setBusy(true); setError(null);
    const revision = generation.current;
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      const permission = existing.granted ? existing : await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Allow location access to use your current position, or enter coordinates.');
        if (!permission.canAskAgain) Alert.alert('Location access is off', 'Enable it in phone Settings.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Settings', onPress: () => { void Linking.openSettings(); } }]);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (revision === generation.current) changeWaypoints([{ latitude: position.coords.latitude, longitude: position.coords.longitude }, ...waypoints.slice(1)]);
    } catch { setError('Current location is unavailable. Try outdoors or enter coordinates.'); }
    finally { setBusy(false); }
  }
  async function calculate() {
    const revision = ++generation.current;
    setBusy(true); setError(null); setResult(null);
    try {
      const route = await walkingDirections(waypoints);
      if (generation.current === revision) setResult(route);
    } catch (cause) {
      if (generation.current === revision) setError(cause instanceof MapServiceError && cause.code === 'configuration' ? 'Route planning needs a Mapbox public access token.' : 'A walking route could not be found. Check your connection or choose different stops.');
    } finally { if (generation.current === revision) setBusy(false); }
  }
  async function save() {
    if (!user || !result) return;
    setBusy(true); setError(null);
    try {
      const route: PlannedWalk = { version: 1, id: selectedId ?? Crypto.randomUUID(), ownerId: user.uid, name: name.trim() || 'My walking route', ...result, waypoints, createdAt: Date.now() };
      await savePlannedWalk(route); setSelectedId(route.id);
    } catch { setError('Route could not save. Try again.'); }
    finally { setBusy(false); }
  }
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}>
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}><IconButton accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></IconButton><AppText variant="headline">Plan a Walk</AppText></View>
    <ActivityMap route={result?.coordinates ?? []} currentLocation={waypoints[0]} fitRoute={Boolean(result)} onSelectCoordinate={add} style={styles.map} />
    <View style={styles.content}>
      {!mapboxToken() ? <AppText accessibilityRole="alert" tone="warning">Mapbox is not configured. Saved routes remain available; new walking directions need a token.</AppText> : null}
      <Button loading={busy} variant="tertiary" onPress={() => { void setCurrentStart(); }}>Use current start</Button>
      {waypoints.map((point, index) => <View key={index} style={styles.row}><AppText style={{ flex: 1 }} variant="bodySmall">{index === 0 ? 'Start' : index === waypoints.length - 1 ? 'Destination' : `Stop ${index}`} · {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</AppText><IconButton disabled={busy} accessibilityLabel={`Remove ${index === 0 ? 'start' : `stop ${index}`}`} onPress={() => changeWaypoints(waypoints.filter((_, i) => i !== index))}><Ionicons name="close" size={20} color={colors.ink} /></IconButton></View>)}
      <View style={styles.row}><TextInput accessibilityLabel="Waypoint latitude" placeholder="Latitude" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" value={latitude} onChangeText={setLatitude} style={[styles.input, { flex: 1, color: colors.ink, borderColor: colors.border }]} /><TextInput accessibilityLabel="Waypoint longitude" placeholder="Longitude" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" value={longitude} onChangeText={setLongitude} style={[styles.input, { flex: 1, color: colors.ink, borderColor: colors.border }]} /></View>
      <Button variant="tertiary" disabled={busy || !latitude.trim() || !longitude.trim()} trailing={<Ionicons name="add" size={20} color={colors.ink} />} onPress={() => add({ latitude: Number(latitude), longitude: Number(longitude) })}>Add stop</Button>
      <Button disabled={waypoints.length < 2 || busy} loading={busy} onPress={() => { void calculate(); }}>Find walking route</Button>
      {result ? <>
        <AppText variant="titleSmall">{(result.distanceMeters / 1000).toFixed(2)} km · {formatWalkTime(result.estimatedDurationSeconds)}</AppText>
        <AppText variant="bodySmall">≈ {estimatedSteps(result.distanceMeters).toLocaleString()} estimated steps</AppText>
        <TextInput accessibilityLabel="Route name" value={name} onChangeText={setName} maxLength={80} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
        <Button disabled={busy} onPress={() => { void save(); }}>{selectedId ? 'Save route changes' : 'Save route'}</Button>
        {selectedId ? <Button variant="tertiary" onPress={() => router.push({ pathname: '/walk/record', params: { routeId: selectedId } })}>Start this walk</Button> : null}
      </> : null}
      {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
      <AppText variant="titleSmall">Saved routes</AppText>
      {saved.loading ? <AppText>Loading routes…</AppText> : saved.error ? <Button onPress={() => { void saved.refresh(); }}>Retry loading routes</Button> : !saved.routes.length ? <AppText tone="secondary">No saved routes yet.</AppText> : saved.routes.map(route => <View key={route.id} style={[styles.saved, { borderColor: colors.border }]}>
        <Button disabled={busy} variant="tertiary" onPress={() => { generation.current++; setWaypoints(route.waypoints); setResult(route); setName(route.name); setSelectedId(route.id); setError(null); }}>{route.name}</Button>
        <AppText variant="caption">{(route.distanceMeters / 1000).toFixed(2)} km · {formatWalkTime(route.estimatedDurationSeconds)}</AppText>
        <View style={styles.row}><Button style={{ flex: 1 }} variant="tertiary" onPress={() => router.push({ pathname: '/walk/record', params: { routeId: route.id } })}>Start walk</Button><IconButton accessibilityLabel={`Delete ${route.name}`} onPress={() => Alert.alert('Delete route?', route.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { if (user) void deletePlannedWalk(user.uid, route.id).catch(() => setError('Route could not delete.')); } }])}><Ionicons name="trash-outline" size={22} color={colors.dangerContent} /></IconButton></View>
      </View>)}
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }, map: { height: 320, width: '100%', marginTop: 12 }, content: { padding: 20, gap: 12 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center' }, input: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 }, saved: { gap: 8, paddingVertical: 12, borderBottomWidth: 1 } });
