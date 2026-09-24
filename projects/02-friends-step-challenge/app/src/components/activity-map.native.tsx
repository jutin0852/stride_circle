import { useEffect, useRef, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

export type ActivityMapPoint = { latitude: number; longitude: number };
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

  useEffect(() => {
    if (!currentLocation) return;
    mapRef.current?.animateToRegion({ ...currentLocation, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 450);
  }, [currentLocation]);

  useEffect(() => {
    if (!fitRoute || route.length < 2) return;
    mapRef.current?.fitToCoordinates(route, { animated: false, edgePadding: { bottom: 170, left: 42, right: 42, top: 140 } });
  }, [fitRoute, route]);

  return <MapView initialRegion={initialRegion} ref={mapRef} showsMyLocationButton={showsUserLocation} showsUserLocation={showsUserLocation} style={style}>
    {route.length > 1 ? <Polyline coordinates={route} strokeColor="#2563EB" strokeWidth={5} /> : null}
  </MapView>;
}
