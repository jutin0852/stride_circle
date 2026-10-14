import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { ActivityMap } from '@/components/activity-map';
import { AppText, Button, FixedHeaderScreen, IconButton } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { estimatedSteps, formatWalkTime, validCoordinate, type PlannedWalk } from '@/domain/walk';
import { useForegroundLocation } from '@/hooks/use-foreground-location';
import { useWalks } from '@/hooks/use-walks';
import type { RoutePoint } from '@/lib/route';
import { MapServiceError, mapboxToken, searchWalkingPlaces, walkingDirections, type WalkingPlaceResult } from '@/services/maps/mapbox';
import { deletePlannedWalk, savePlannedWalk } from '@/services/walks/repository';

type RouteStop = { point: RoutePoint; name: string };

export function WalkPlanner() {
  const { user } = useAuth(); const colors = useAppColors(); const insets = useSafeAreaInsets();
  const saved = useWalks(user?.uid);
  const location = useForegroundLocation(false);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const waypoints = stops.map((stop) => stop.point);
  const [cameraTarget, setCameraTarget] = useState<RoutePoint | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof walkingDirections>> | null>(null);
  const [name, setName] = useState('My walking route');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WalkingPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const generation = useRef(0);
  const searchGeneration = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedSuggestion = useRef<string | null>(null);

  function changeStops(next: RouteStop[]) {
    generation.current++;
    setStops(next);
    setResult(null);
    setSelectedId(null);
    setError(null);
  }
  function add(point: RoutePoint, label = 'Map point') {
    if (busy) return;
    if (!validCoordinate(point) || stops.length >= 25) {
      setError('A route can contain up to 25 valid points. Remove a point to continue.');
      return;
    }
    changeStops([...stops, { point, name: label }]);
  }
  const runPlaceSearch = useCallback(async (text: string, revision: number) => {
    try {
      const places = await searchWalkingPlaces(text, location.point ?? undefined);
      if (searchGeneration.current !== revision) return;
      setSearchResults(places);
      setSearchMessage(places.length ? null : 'No nearby places found. Try another landmark or street.');
    } catch (cause) {
      if (searchGeneration.current !== revision) return;
      setSearchMessage(cause instanceof MapServiceError && cause.code === 'configuration'
        ? 'Place search needs a Mapbox public access token.'
        : 'Places could not be searched. Check your connection and try again.');
    } finally {
      if (searchGeneration.current === revision) setSearching(false);
    }
  }, [location.point]);
  const searchPlaces = useCallback((value = query) => {
    const text = value.trim();
    if (text.length < 3) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    const revision = ++searchGeneration.current;
    setSearching(true); setSearchResults([]); setSearchMessage(null); setError(null);
    void runPlaceSearch(text, revision);
  }, [query, runPlaceSearch]);
  function changeSearchQuery(value: string) {
    selectedSuggestion.current = null;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    searchGeneration.current++;
    setQuery(value);
    setSearching(false); setSearchResults([]); setSearchMessage(null); setError(null);
  }
  useEffect(() => {
    const text = query.trim();
    if (selectedSuggestion.current === query) {
      selectedSuggestion.current = null;
      searchGeneration.current++;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = null;
      return;
    }
    selectedSuggestion.current = null;
    if (text.length < 3) {
      searchGeneration.current++;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = null;
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const revision = ++searchGeneration.current;
    const timer = setTimeout(() => {
      if (searchTimer.current === timer) searchTimer.current = null;
      setSearching(true); setSearchResults([]); setSearchMessage(null); setError(null);
      void runPlaceSearch(text, revision);
    }, 450);
    searchTimer.current = timer;
    return () => {
      clearTimeout(timer);
      if (searchTimer.current === timer) searchTimer.current = null;
    };
  }, [query, runPlaceSearch]);
  async function recenterMap() {
    if (location.status === 'services-disabled' || location.status === 'denied' && !location.canAskAgain) {
      await location.openSettings();
      return;
    }
    const point = await location.refresh(true);
    if (!point) {
      setError('Your location is unavailable. Search for a place or check location access in Settings.');
      return;
    }
    setError(null);
    setCameraTarget(point);
  }
  function selectPlace(place: WalkingPlaceResult) {
    if (busy || stops.length >= 25) return;
    add(place.point, place.label);
    setCameraTarget(place.point);
    selectedSuggestion.current = place.label;
    setQuery(place.label);
    setSearching(false);
    setSearchResults([]);
    setSearchMessage(null);
    Keyboard.dismiss();
  }
  async function calculate() {
    const revision = ++generation.current;
    setBusy(true); setError(null); setResult(null);
    try {
      const route = await walkingDirections(waypoints);
      if (generation.current === revision) setResult(route);
    } catch (cause) {
      if (generation.current === revision) setError(cause instanceof MapServiceError && cause.code === 'configuration'
        ? 'Route planning needs a Mapbox public access token.'
        : 'A walking route could not be found. Check your connection or choose different stops.');
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
  function loadSavedRoute(route: PlannedWalk) {
    generation.current++;
    setStops(route.waypoints.map((point, index) => ({ point, name: index === 0 ? 'Start' : index === route.waypoints.length - 1 ? 'Destination' : `Stop ${index}` })));
    setResult(route); setName(route.name); setSelectedId(route.id); setError(null); setSearchResults([]);
    setCameraTarget(route.waypoints[0] ?? route.coordinates[0] ?? null);
  }

  return <FixedHeaderScreen backgroundColor={colors.background} header={<View style={styles.header}><IconButton accessibilityLabel="Back" onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.ink} /></IconButton><AppText variant="headline">Plan a walk</AppText></View>} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }} scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
    <View style={styles.content}>
      <AppText tone="secondary">Search for a place, or tap the map to add your start, stops, and destination. The route follows walkable streets.</AppText>
      <View style={styles.searchContainer}>
        <View style={[styles.searchRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput accessibilityLabel="Search for a place" placeholder="Search a place or landmark" placeholderTextColor={colors.muted} value={query} onChangeText={changeSearchQuery} onSubmitEditing={() => searchPlaces()} returnKeyType="search" maxLength={256} style={[styles.searchInput, { color: colors.ink }]} />
          <Pressable accessibilityRole="button" accessibilityLabel="Search places" disabled={query.trim().length < 3 || searching} onPress={() => searchPlaces()} style={styles.searchButton}>
            {searching ? <ActivityIndicator color={colors.accent} size="small" /> : <Ionicons name="arrow-forward" size={20} color={colors.accent} />}
          </Pressable>
        </View>
        {searching || searchResults.length > 0 || searchMessage ? <View accessibilityLabel="Place suggestions" style={[styles.suggestions, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {searching && searchResults.length === 0 ? <View style={styles.suggestionStatus}><ActivityIndicator color={colors.accent} size="small" /><AppText variant="caption" tone="secondary">Searching nearby places…</AppText></View> : null}
          {searchResults.map((place, index) => <Pressable key={`${place.label}-${index}`} accessibilityRole="button" accessibilityLabel={`Add ${place.label}${place.detail ? `, ${place.detail}` : ''}`} onPress={() => selectPlace(place)} style={[styles.searchResult, { borderBottomColor: colors.border }, index === searchResults.length - 1 && styles.lastSearchResult]}>
            <Ionicons name="location-outline" size={20} color={colors.accent} />
            <View style={styles.flex}><AppText variant="label">{place.label}</AppText>{place.detail ? <AppText variant="caption" tone="secondary">{place.detail}</AppText> : null}</View>
            <Ionicons name="add" size={20} color={colors.ink} />
          </Pressable>)}
          {!searching && searchMessage ? <View style={styles.suggestionStatus}><AppText variant="caption" tone="secondary">{searchMessage}</AppText></View> : null}
        </View> : null}
      </View>

      {location.point || cameraTarget || stops.length ? <ActivityMap
        route={result?.coordinates ?? []}
        currentLocation={location.point}
        cameraTarget={cameraTarget ?? location.point}
        waypoints={waypoints}
        fitRoute={Boolean(result)}
        showsRecenterButton
        onRecenter={() => { void recenterMap(); }}
        onSelectCoordinate={(point) => { setSearchResults([]); setSearchMessage(null); add(point); }}
        style={styles.map}
      /> : <View style={[styles.mapPrompt, { backgroundColor: colors.infoSurface, borderColor: colors.border }]}>
        <Ionicons name="map-outline" size={26} color={colors.accent} />
        <AppText variant="titleSmall">Choose a place to begin</AppText>
        <AppText tone="secondary">Search for a landmark to place your start. The map will appear so you can add stops and a destination.</AppText>
        {location.status === 'denied' || location.status === 'services-disabled' || location.status === 'error' ? <Button variant="tertiary" onPress={() => { void recenterMap(); }}>{location.status === 'services-disabled' || location.status === 'denied' && !location.canAskAgain ? 'Open location settings' : location.status === 'error' ? 'Try location again' : 'Enable location'}</Button> : null}
      </View>}

      {stops.map((stop, index) => {
        const pointLabel = index === 0 ? 'Start' : index === stops.length - 1 ? 'Destination' : `Stop ${index}`;
        return <View key={`${index}-${stop.point.latitude}-${stop.point.longitude}`} style={[styles.stopRow, { borderColor: colors.border }]}>
          <View style={[styles.stopMarker, { backgroundColor: colors.infoSurface }]}><AppText variant="label" style={{ color: colors.accent }}>{index + 1}</AppText></View>
          <View style={styles.flex}><AppText variant="label">{pointLabel}</AppText><AppText variant="caption" tone="secondary">{stop.name}</AppText></View>
          <IconButton disabled={busy} accessibilityLabel={`Remove ${pointLabel.toLowerCase()}`} onPress={() => changeStops(stops.filter((_, stopIndex) => stopIndex !== index))}><Ionicons name="close" size={20} color={colors.ink} /></IconButton>
        </View>;
      })}
      <Button disabled={waypoints.length < 2 || busy} loading={busy} onPress={() => { void calculate(); }}>Find walking route</Button>
      {result ? <>
        <View style={[styles.routeSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryMetric}><AppText variant="caption" tone="secondary">Distance</AppText><AppText variant="label">{(result.distanceMeters / 1000).toFixed(2)} km</AppText></View>
          <View style={styles.summaryMetric}><AppText variant="caption" tone="secondary">Walking time</AppText><AppText variant="label">{formatWalkTime(result.estimatedDurationSeconds)}</AppText></View>
          <View style={styles.summaryMetric}><AppText variant="caption" tone="secondary">Estimated steps</AppText><AppText variant="label">≈ {estimatedSteps(result.distanceMeters).toLocaleString()}</AppText></View>
        </View>
        <TextInput accessibilityLabel="Route name" value={name} onChangeText={setName} maxLength={80} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} />
        <Button disabled={busy} loading={busy} onPress={() => { void save(); }}>{selectedId ? 'Save route changes' : 'Save route'}</Button>
        {selectedId ? <Button variant="tertiary" onPress={() => router.replace({ pathname: '/activity', params: { routeId: selectedId } })}>Use this route</Button> : null}
      </> : null}
      {error ? <AppText accessibilityRole="alert" tone="danger">{error}</AppText> : null}
      {!mapboxToken() ? <AppText accessibilityRole="alert" tone="warning">Mapbox is not configured. Saved routes remain available; place search and new walking directions need a public access token.</AppText> : null}

      <AppText variant="titleSmall">Saved routes</AppText>
      {saved.loading ? <AppText>Loading routes…</AppText> : saved.error ? <Button onPress={() => { void saved.refresh(); }}>Retry loading routes</Button> : !saved.routes.length ? <AppText tone="secondary">No saved routes yet.</AppText> : saved.routes.map(route => <View key={route.id} style={[styles.saved, { borderColor: colors.border }]}>
        <Button disabled={busy} variant="tertiary" onPress={() => loadSavedRoute(route)}>{route.name}</Button>
        <AppText variant="caption">{(route.distanceMeters / 1000).toFixed(2)} km · {formatWalkTime(route.estimatedDurationSeconds)}</AppText>
        <View style={styles.row}><Button style={{ flex: 1 }} variant="tertiary" onPress={() => router.replace({ pathname: '/activity', params: { routeId: route.id } })}>Use this route</Button><IconButton accessibilityLabel={`Delete ${route.name}`} onPress={() => Alert.alert('Delete route?', route.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { if (user) void deletePlannedWalk(user.uid, route.id).catch(() => setError('Route could not delete.')); } }])}><Ionicons name="trash-outline" size={22} color={colors.dangerContent} /></IconButton></View>
      </View>)}
    </View>
  </FixedHeaderScreen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  content: { padding: 20, gap: 12 },
  map: { height: 320, width: '100%', marginTop: 4, borderRadius: 16, overflow: 'hidden' },
  mapPrompt: { height: 220, borderWidth: 1, borderRadius: 16, padding: 20, justifyContent: 'center', alignItems: 'flex-start', gap: 10 },
  searchContainer: { position: 'relative', zIndex: 2 },
  searchRow: { minHeight: 54, borderWidth: 1, borderRadius: 14, paddingLeft: 14, paddingRight: 6, alignItems: 'center', flexDirection: 'row', gap: 10 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, fontSize: 16 },
  searchButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  suggestions: { position: 'absolute', top: 58, left: 0, right: 0, zIndex: 3, elevation: 4, maxHeight: 320, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  suggestionStatus: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 },
  searchResult: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lastSearchResult: { borderBottomWidth: 0 },
  stopRow: { minHeight: 56, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stopMarker: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  flex: { flex: 1, minWidth: 0 },
  routeSummary: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 14, padding: 12 },
  summaryMetric: { flex: 1, minWidth: 0, gap: 4 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  saved: { gap: 8, paddingVertical: 12, borderBottomWidth: 1 },
});
