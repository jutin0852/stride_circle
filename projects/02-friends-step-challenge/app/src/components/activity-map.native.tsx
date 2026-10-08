import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import type MapboxType from '@rnmapbox/maps';
import { routeBounds, routeGeoJSON } from '@/domain/walk';
import { simplifyRoute, type RoutePoint } from '@/lib/route';
import { useAppColors } from '@/design-system/use-app-theme';
import { mapboxToken } from '@/services/maps/mapbox';
import { walkingMapStyle } from '@/services/maps/style';
import { AppText } from '@/components/ui';

export type ActivityMapPoint = RoutePoint;
export type ActivityMapRegion = ActivityMapPoint & { latitudeDelta: number; longitudeDelta: number };
export type ActivityMapProps = {
  currentLocation?: ActivityMapPoint | null; fallback?: ReactNode; fitRoute?: boolean; initialRegion?: ActivityMapRegion;
  route: ActivityMapPoint[]; plannedRoute?: ActivityMapPoint[]; showsUserLocation?: boolean; style: StyleProp<ViewStyle>;
  onSelectCoordinate?: (point: RoutePoint) => void;
};
let native: typeof MapboxType | null = null;
// Older binaries and Expo Go can still record without mounting the native map.
if (Constants.executionEnvironment !== 'storeClient') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- native import must be guarded for existing binaries
  try { native = require('@rnmapbox/maps').default as typeof MapboxType; } catch { native = null; }
}
export const ActivityMap = memo(function ActivityMap({ currentLocation, fitRoute = false, initialRegion, route, plannedRoute, showsUserLocation = false, style, onSelectCoordinate }: ActivityMapProps) {
  const camera = useRef<import('@rnmapbox/maps').Camera>(null);
  const colors = useAppColors();
  const dark = useColorScheme() === 'dark';
  const [failed, setFailed] = useState(false);
  const [following, setFollowing] = useState(true);
  const [overview, setOverview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [configuredToken, setConfiguredToken] = useState<string | null>(null);
  const token = mapboxToken();
  const geometry = useMemo(() => routeGeoJSON(simplifyRoute(route, 1500)), [route]);
  const planned = useMemo(() => routeGeoJSON(plannedRoute ?? []), [plannedRoute]);
  const styleJSON = useMemo(() => walkingMapStyle(colors, dark), [colors, dark]);
  useEffect(() => {
    let active = true;
    if (native && token) {
      const sdk = native;
      void (async () => { await sdk.setAccessToken(token); await sdk.setTelemetryEnabled(false); })().then(() => {
        if (active) setConfiguredToken(token);
      }).catch(() => { if (active) setFailed(true); });
    }
    return () => { active = false; };
  }, [token, attempt]);
  useEffect(() => {
    if (fitRoute || overview) {
      const bounds = routeBounds(route.length ? route : plannedRoute ?? []);
      if (!bounds) return;
      if (bounds.north === bounds.south && bounds.east === bounds.west) camera.current?.setCamera({ centerCoordinate: [bounds.west, bounds.south], zoomLevel: 16, animationDuration: 0 });
      else camera.current?.fitBounds([bounds.east, bounds.north], [bounds.west, bounds.south], [80, 40, 180, 40], 0);
    } else if (following && currentLocation) camera.current?.setCamera({ centerCoordinate: [currentLocation.longitude, currentLocation.latitude], zoomLevel: 16, animationDuration: 0 });
  }, [currentLocation, fitRoute, following, overview, route, plannedRoute, loaded]);
  if (!native || !token || failed || configuredToken !== token) return <View style={[style, styles.fallback, { backgroundColor: colors.soft }]}>
    <AppText accessibilityRole={configuredToken !== token && token && native && !failed ? undefined : 'alert'} style={{ color: colors.muted, textAlign: 'center' }}>{!token ? 'Map not configured. Your walk can still record and save.' : !native ? 'Maps need an updated development build.' : failed ? 'Map unavailable. Your recorded route is safe.' : 'Loading map…'}</AppText>
    {failed ? <Pressable accessibilityRole="button" onPress={() => { setLoaded(false); setConfiguredToken(null); setFailed(false); setAttempt(value => value + 1); }} style={styles.retry}><AppText style={{ color: colors.accent }}>Retry map</AppText></Pressable> : null}
  </View>;
  const Mapbox = native;
  const first = currentLocation ?? route[0] ?? plannedRoute?.[0] ?? initialRegion;
  return <View style={style}>
    <Mapbox.MapView style={StyleSheet.absoluteFill} styleJSON={styleJSON} scaleBarEnabled={false} onDidFinishLoadingMap={() => setLoaded(true)} onMapLoadingError={() => setFailed(true)}
      onTouchStart={() => setFollowing(false)} onPress={event => {
        if (event.geometry.type === 'Point') onSelectCoordinate?.({ longitude: event.geometry.coordinates[0], latitude: event.geometry.coordinates[1] });
      }}>
      <Mapbox.Camera ref={camera} defaultSettings={{ zoomLevel: first ? 14 : 2, ...(first ? { centerCoordinate: [first.longitude, first.latitude] } : {}) }} />
      <Mapbox.ShapeSource id="planned" shape={planned}><Mapbox.LineLayer id="planned-line" style={{ lineColor: colors.muted, lineWidth: 4, lineDasharray: [2, 2] }} /></Mapbox.ShapeSource>
      <Mapbox.ShapeSource id="walk" shape={geometry}><Mapbox.LineLayer id="walk-line" style={{ lineColor: colors.accent, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }} /></Mapbox.ShapeSource>
      {currentLocation ? <Mapbox.ShapeSource id="position" shape={{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [currentLocation.longitude, currentLocation.latitude] } }}><Mapbox.CircleLayer id="position-dot" style={{ circleRadius: 8, circleColor: colors.accent, circleStrokeColor: colors.card, circleStrokeWidth: 3 }} /></Mapbox.ShapeSource> : null}
      {route.length ? <Mapbox.ShapeSource id="endpoints" shape={{ type: 'FeatureCollection', features: [route[0], route.at(-1)!].map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] } })) }}><Mapbox.CircleLayer id="endpoint-dots" style={{ circleRadius: 5, circleColor: colors.card, circleStrokeColor: colors.accent, circleStrokeWidth: 2 }} /></Mapbox.ShapeSource> : null}
    </Mapbox.MapView>
    {showsUserLocation ? <View style={styles.mapControls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Recenter on your location" onPress={() => { setOverview(false); setFollowing(true); }} style={[styles.recenter, { backgroundColor: colors.card }]}><Ionicons name="locate" color={colors.accent} size={24} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Show the whole walking route" onPress={() => { setFollowing(false); setOverview(true); }} style={[styles.recenter, { backgroundColor: colors.card }]}><Ionicons name="scan-outline" color={colors.accent} size={24} /></Pressable>
    </View> : null}
  </View>;
});
const styles = StyleSheet.create({ fallback: { alignItems: 'center', justifyContent: 'center', padding: 24 }, retry: { minHeight: 48, padding: 14 }, mapControls: { position: 'absolute', right: 18, top: '40%', gap: 8 }, recenter: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' } });
