import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type ActivityStatus = 'idle' | 'requesting' | 'tracking' | 'paused' | 'finished' | 'denied' | 'error';
export type GpsSignalStatus = 'idle' | 'acquiring' | 'ready' | 'weak' | 'disabled';
export type RoutePoint = { latitude: number; longitude: number };
export type FinishedActivity = { distanceMeters: number; durationMs: number; route: RoutePoint[] };

type ActivityTracking = {
  status: ActivityStatus;
  elapsedMs: number;
  distanceMeters: number;
  currentPaceSecondsPerKm: number | null;
  route: RoutePoint[];
  currentLocation: RoutePoint | null;
  accuracyMeters: number | null;
  gpsSignal: GpsSignalStatus;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  finish: () => FinishedActivity | null;
  reset: () => void;
};

const MAX_ACCURACY_METERS = 35;
const MAX_REASONABLE_SPEED_METERS_PER_SECOND = 8;
const GPS_STALE_AFTER_MS = 15_000;

function distanceBetween(first: RoutePoint, second: RoutePoint) {
  const earthRadius = 6_371_000;
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const latitudeA = (first.latitude * Math.PI) / 180;
  const latitudeB = (second.latitude * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useActivityTracking(): ActivityTracking {
  const [status, setStatus] = useState<ActivityStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecondsPerKm, setCurrentPaceSecondsPerKm] = useState<number | null>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<RoutePoint | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [gpsSignal, setGpsSignal] = useState<GpsSignalStatus>('idle');
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const previousPointRef = useRef<{ point: RoutePoint; timestamp: number } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforeCurrentSegmentRef = useRef(0);
  const lastAcceptedLocationAtRef = useRef<number | null>(null);

  const stopWatching = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  const handleLocation = useCallback((location: Location.LocationObject) => {
    const accuracy = location.coords.accuracy;
    setAccuracyMeters(accuracy);
    if (accuracy === null || accuracy > MAX_ACCURACY_METERS) {
      previousPointRef.current = null;
      setGpsSignal('weak');
      return;
    }
    const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
    const timestamp = location.timestamp;
    const previous = previousPointRef.current;
    setCurrentLocation(point);
    lastAcceptedLocationAtRef.current = Date.now();
    setGpsSignal('ready');
    if (!previous) {
      previousPointRef.current = { point, timestamp };
      setRoute([point]);
      return;
    }
    const segmentMeters = distanceBetween(previous.point, point);
    const secondsSincePrevious = Math.max((timestamp - previous.timestamp) / 1000, 1);
    if (segmentMeters / secondsSincePrevious > MAX_REASONABLE_SPEED_METERS_PER_SECOND) {
      previousPointRef.current = { point, timestamp };
      return;
    }
    previousPointRef.current = { point, timestamp };
    if (segmentMeters < 2) return;
    setRoute((points) => [...points, point]);
    setDistanceMeters((total) => total + segmentMeters);
    setCurrentPaceSecondsPerKm((secondsSincePrevious / segmentMeters) * 1000);
  }, []);

  const beginWatching = useCallback(async () => {
    stopWatching();
    watcherRef.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5_000 }, handleLocation);
  }, [handleLocation, stopWatching]);

  const start = useCallback(async () => {
    setStatus('requesting');
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setGpsSignal('disabled');
        setStatus('error');
        return;
      }
      const existingPermission = await Location.getForegroundPermissionsAsync();
      const permission = existingPermission.granted ? existingPermission : await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { setStatus('denied'); return; }
      previousPointRef.current = null;
      elapsedBeforeCurrentSegmentRef.current = 0;
      lastAcceptedLocationAtRef.current = null;
      startedAtRef.current = Date.now();
      setElapsedMs(0); setDistanceMeters(0); setCurrentPaceSecondsPerKm(null); setCurrentLocation(null); setAccuracyMeters(null); setRoute([]);
      setGpsSignal('acquiring');
      setStatus('tracking');
      await beginWatching();
    } catch { setGpsSignal('idle'); setStatus('error'); }
  }, [beginWatching]);

  const pause = useCallback(() => {
    if (status !== 'tracking' || startedAtRef.current === null) return;
    const elapsed = elapsedBeforeCurrentSegmentRef.current + Date.now() - startedAtRef.current;
    elapsedBeforeCurrentSegmentRef.current = elapsed;
    startedAtRef.current = null;
    setElapsedMs(elapsed); stopWatching(); setStatus('paused');
  }, [status, stopWatching]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) { setGpsSignal('disabled'); setStatus('error'); return; }
      previousPointRef.current = null;
      lastAcceptedLocationAtRef.current = null;
      startedAtRef.current = Date.now();
      setGpsSignal('acquiring');
      setStatus('tracking');
      await beginWatching();
    } catch { setGpsSignal('idle'); setStatus('error'); }
  }, [beginWatching, status]);

  const finish = useCallback((): FinishedActivity | null => {
    if (status !== 'tracking' && status !== 'paused') return null;
    let durationMs = elapsedBeforeCurrentSegmentRef.current;
    if (status === 'tracking' && startedAtRef.current !== null) {
      durationMs += Date.now() - startedAtRef.current;
      elapsedBeforeCurrentSegmentRef.current = durationMs;
      setElapsedMs(durationMs);
    }
    startedAtRef.current = null;
    stopWatching();
    setGpsSignal('idle');
    setStatus('finished');
    return { distanceMeters, durationMs, route };
  }, [distanceMeters, route, status, stopWatching]);

  const reset = useCallback(() => {
    stopWatching(); previousPointRef.current = null; startedAtRef.current = null; elapsedBeforeCurrentSegmentRef.current = 0;
    lastAcceptedLocationAtRef.current = null;
    setElapsedMs(0); setDistanceMeters(0); setCurrentPaceSecondsPerKm(null); setCurrentLocation(null); setAccuracyMeters(null); setGpsSignal('idle'); setRoute([]); setStatus('idle');
  }, [stopWatching]);

  useEffect(() => {
    if (status !== 'tracking' || startedAtRef.current === null) return;
    const timer = setInterval(() => setElapsedMs(elapsedBeforeCurrentSegmentRef.current + Date.now() - (startedAtRef.current ?? Date.now())), 1_000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status !== 'tracking') return;
    const watchdog = setInterval(() => {
      const lastAcceptedAt = lastAcceptedLocationAtRef.current;
      if (!lastAcceptedAt || Date.now() - lastAcceptedAt > GPS_STALE_AFTER_MS) setGpsSignal('weak');
    }, 5_000);
    return () => clearInterval(watchdog);
  }, [status]);
  useEffect(() => stopWatching, [stopWatching]);

  return { status, elapsedMs, distanceMeters, currentPaceSecondsPerKm, route, currentLocation, accuracyMeters, gpsSignal, start, pause, resume, finish, reset };
}
