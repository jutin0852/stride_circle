import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View, useColorScheme, type StyleProp, type ViewStyle } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Polyline } from 'react-native-maps';
import { splitRoute, type RoutePoint } from '@/lib/route';
import { useAppColors } from '@/design-system/use-app-theme';

export type ActivityMapPoint = RoutePoint;
export type ActivityMapRegion = ActivityMapPoint & { latitudeDelta: number; longitudeDelta: number };

type ActivityMapProps = {
  currentLocation?: ActivityMapPoint | null;
  fallback?: ReactNode;
  fitRoute?: boolean;
  initialRegion?: ActivityMapRegion;
  route: ActivityMapPoint[];
  showsUserLocation?: boolean;
  style: StyleProp<ViewStyle>;
};

export function ActivityMap({ currentLocation, fitRoute = false, initialRegion, route, showsUserLocation = false, style }: ActivityMapProps) {
  const mapRef = useRef<MapView>(null);
  const isDark = useColorScheme() === 'dark';
  const colors = useAppColors();

  useEffect(() => {
    if (!currentLocation) return;
    mapRef.current?.animateToRegion({ ...currentLocation, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 450);
  }, [currentLocation]);

  useEffect(() => {
    if (!fitRoute || route.length < 2) return;
    mapRef.current?.fitToCoordinates(route, { animated: false, edgePadding: { bottom: 170, left: 42, right: 42, top: 140 } });
  }, [fitRoute, route]);

  if (process.env.EXPO_OS === 'android' && !Constants.expoConfig?.extra?.maps?.androidConfigured) {
    return <View style={[style, styles.unconfigured, { backgroundColor: colors.soft }]}><Text style={[styles.message, { color: colors.muted }]}>Android map preview isn’t configured yet. Route recording works without it.</Text></View>;
  }

  return <MapView initialRegion={initialRegion} ref={mapRef} showsMyLocationButton={showsUserLocation} showsUserLocation={showsUserLocation} style={style}>
    {splitRoute(route).map((segment, index) => segment.length > 1 ? <Polyline coordinates={segment} key={index} strokeColor={isDark ? '#4BB5D0' : '#2563EB'} strokeWidth={5} /> : null)}
  </MapView>;
}

const styles = StyleSheet.create({
  unconfigured: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  message: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
