import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import * as Location from 'expo-location';
import type { RoutePoint } from '@/lib/route';

export type ForegroundLocationStatus = 'loading' | 'ready' | 'denied' | 'services-disabled' | 'error' | 'unsupported';

// Returning to the tab within this window reuses the known position instead of
// asking GPS again, which saves battery and keeps the screen still.
export const LOCATION_REFRESH_INTERVAL_MS = 60_000;

/**
 * Foreground location for centering the map. `requestOnMount` asks for
 * permission when needed; `active` is usually the screen's focus state.
 * Refreshes run only while active, and a refresh never puts an already-located
 * screen back into `loading`, so switching tabs does not make notices appear
 * and disappear.
 */
export function useForegroundLocation(requestOnMount = true, active = true) {
  const [point, setPoint] = useState<RoutePoint | null>(null);
  const [status, setStatus] = useState<ForegroundLocationStatus>('loading');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const pointRef = useRef<RoutePoint | null>(null);
  const lastLocatedAt = useRef(0);
  const startedInBackground = useRef(!active);
  const inFlight = useRef<{ read: Promise<RoutePoint | null>; requests: boolean } | null>(null);

  const locate = useCallback((next: RoutePoint) => {
    pointRef.current = next;
    lastLocatedAt.current = Date.now();
    setPoint(next);
    setStatus('ready');
  }, []);

  const readLocation = useCallback(async (requestIfNeeded: boolean): Promise<RoutePoint | null> => {
    if (process.env.EXPO_OS === 'web') {
      setStatus('unsupported');
      return null;
    }

    // Stale-while-revalidate: only a screen with no position shows loading.
    if (!pointRef.current) setStatus('loading');
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

      // The last known fix is instant, so the map can center right away while
      // a fresh fix is requested in the background.
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) locate({ latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude });

      try {
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const currentPoint = { latitude: current.coords.latitude, longitude: current.coords.longitude };
        locate(currentPoint);
        return currentPoint;
      } catch {
        if (pointRef.current) return pointRef.current;
        setStatus('error');
        return null;
      }
    } catch {
      if (pointRef.current) return pointRef.current;
      setStatus('error');
      return null;
    }
  }, [locate]);

  // Overlapping callers share one read instead of asking GPS twice. A caller
  // that may prompt for permission waits for a silent read and then runs its
  // own, so the prompt is never skipped.
  const refresh = useCallback((requestIfNeeded = false): Promise<RoutePoint | null> => {
    const current = inFlight.current;
    if (current && (current.requests || !requestIfNeeded)) return current.read;
    const read = (current ? current.read.catch(() => null) : Promise.resolve(null))
      .then(() => readLocation(requestIfNeeded))
      .finally(() => { if (inFlight.current?.read === read) inFlight.current = null; });
    inFlight.current = { read, requests: requestIfNeeded };
    return read;
  }, [readLocation]);

  // A background screen (the Activity tab loads at launch) quietly picks up
  // the last known position without prompting, so its first visit is ready.
  useEffect(() => {
    if (!startedInBackground.current) return;
    const prefetch = setTimeout(() => { if (!pointRef.current) void refresh(false); }, 0);
    return () => clearTimeout(prefetch);
  }, [refresh]);

  useEffect(() => {
    if (!active) return;

    const refreshIfStale = (requestIfNeeded: boolean) => {
      if (pointRef.current && Date.now() - lastLocatedAt.current < LOCATION_REFRESH_INTERVAL_MS) return;
      void refresh(requestIfNeeded);
    };
    const initialRefresh = setTimeout(() => refreshIfStale(requestOnMount), 0);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshIfStale(false);
    });
    return () => { clearTimeout(initialRefresh); subscription.remove(); };
  }, [active, refresh, requestOnMount]);

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return { point, status, canAskAgain, refresh, openSettings };
}
