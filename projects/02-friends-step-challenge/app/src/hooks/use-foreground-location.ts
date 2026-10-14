import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import * as Location from 'expo-location';
import type { RoutePoint } from '@/lib/route';

export type ForegroundLocationStatus = 'loading' | 'ready' | 'denied' | 'services-disabled' | 'error' | 'unsupported';

export function useForegroundLocation(requestOnMount = true) {
  const [point, setPoint] = useState<RoutePoint | null>(null);
  const [status, setStatus] = useState<ForegroundLocationStatus>('loading');
  const [canAskAgain, setCanAskAgain] = useState(true);

  const refresh = useCallback(async (requestIfNeeded = false): Promise<RoutePoint | null> => {
    if (process.env.EXPO_OS === 'web') {
      setStatus('unsupported');
      return null;
    }

    setStatus('loading');
    try {
      if (!await Location.hasServicesEnabledAsync()) {
        setStatus('services-disabled');
        return null;
      }

      const existing = await Location.getForegroundPermissionsAsync();
      const permission = existing.granted || !requestIfNeeded || !existing.canAskAgain
        ? existing
        : await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(permission.canAskAgain);
      if (!permission.granted) {
        setStatus('denied');
        return null;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      const lastPoint = lastKnown ? { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude } : null;
      if (lastPoint) setPoint(lastPoint);

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const currentPoint = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        setPoint(currentPoint);
        setStatus('ready');
        return currentPoint;
      } catch {
        if (lastPoint) {
          setStatus('ready');
          return lastPoint;
        }
        setStatus('error');
        return null;
      }
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    const initialRefresh = setTimeout(() => { void refresh(requestOnMount); }, 0);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh(false);
    });
    return () => { clearTimeout(initialRefresh); subscription.remove(); };
  }, [refresh, requestOnMount]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { point, status, canAskAgain, refresh, openSettings };
}
