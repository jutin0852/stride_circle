import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export type ActivityMapPoint = { latitude: number; longitude: number };
export type ActivityMapRegion = ActivityMapPoint & { latitudeDelta: number; longitudeDelta: number };

type ActivityMapProps = {
  currentLocation?: ActivityMapPoint | null;
  cameraTarget?: ActivityMapPoint | null;
  fallback?: ReactNode;
  fitRoute?: boolean;
  initialRegion?: ActivityMapRegion;
  route: ActivityMapPoint[];
  plannedRoute?: ActivityMapPoint[];
  waypoints?: ActivityMapPoint[];
  onSelectCoordinate?: (point: ActivityMapPoint) => void;
  onRecenter?: () => void;
  showsUserLocation?: boolean;
  showsRecenterButton?: boolean;
  style: StyleProp<ViewStyle>;
};

/** react-native-maps is native-only. Keep web useful instead of crashing the entire router. */
export function ActivityMap({ fallback, style }: ActivityMapProps) {
  return <View style={style}>{fallback}</View>;
}
