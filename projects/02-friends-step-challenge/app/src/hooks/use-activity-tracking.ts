import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import type { RoutePoint } from '@/lib/route';

export type { RoutePoint } from '@/lib/route';
export type ActivityStatus = 'idle' | 'requesting' | 'tracking' | 'paused' | 'finished' | 'denied' | 'error';
export type GpsSignalStatus = 'idle' | 'acquiring' | 'ready' | 'weak' | 'disabled';
export type PauseReason = 'manual' | 'background' | 'gps-error' | 'recovered' | null;
export type FinishedActivity = { distanceMeters: number; durationMs: number; route: RoutePoint[]; activityId?: string; activityType?: 'walk' | 'run'; dateKey?: string; userId?: string };

const MAX_ACCURACY_METERS = 35;
const MAX_REASONABLE_SPEED_METERS_PER_SECOND = 8;
const GPS_STALE_AFTER_MS = 15_000;

function distanceBetween(first: RoutePoint, second: RoutePoint) {
  const latitudeDelta = ((second.latitude - first.latitude) * Math.PI) / 180;
  const longitudeDelta = ((second.longitude - first.longitude) * Math.PI) / 180;
  const latitudeA = (first.latitude * Math.PI) / 180;
  const latitudeB = (second.latitude * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useActivityTracking(userId?: string) {
  // Web has no native background recorder; the mobile hook persists account-owned sessions.
  void userId;
  const [status, setStatus] = useState<ActivityStatus>('idle');
  const [isPreparing, setPreparing] = useState(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [currentPaceSecondsPerKm, setCurrentPaceSecondsPerKm] = useState<number | null>(null);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<RoutePoint | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [gpsSignal, setGpsSignal] = useState<GpsSignalStatus>('idle');
  const statusRef = useRef<ActivityStatus>('idle');
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const previousPointRef = useRef<{ point: RoutePoint; timestamp: number } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforeCurrentSegmentRef = useRef(0);
  const lastAcceptedLocationAtRef = useRef<number | null>(null);
  // Sensor callbacks and Finish can happen before React has rendered again.
  const recordingRef = useRef({ distanceMeters: 0, route: [] as RoutePoint[] });

  const changeStatus = useCallback((next: ActivityStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const stopWatching = useCallback(() => {
    generationRef.current += 1;
    watcherRef.current?.remove();
    watcherRef.current = null;
    previousPointRef.current = null;
    preparingRef.current = false;
    setPreparing(false);
  }, []);

  const pauseRecording = useCallback((reason: PauseReason) => {
    if (statusRef.current !== 'tracking' && statusRef.current !== 'requesting' && !preparingRef.current) return;
    if (startedAtRef.current !== null) elapsedBeforeCurrentSegmentRef.current += Date.now() - startedAtRef.current;
    startedAtRef.current = null;
    setElapsedMs(elapsedBeforeCurrentSegmentRef.current);
    stopWatching();
    setCurrentPaceSecondsPerKm(null);
    setPauseReason(reason);
    changeStatus(reason === 'background' && recordingRef.current.route.length === 0 && elapsedBeforeCurrentSegmentRef.current === 0 ? 'idle' : 'paused');
  }, [changeStatus, stopWatching]);

  const handleLocation = useCallback((location: Location.LocationObject) => {
    if (statusRef.current !== 'tracking') return;
    const accuracy = location.coords.accuracy;
    setAccuracyMeters(accuracy);
    if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > MAX_ACCURACY_METERS) {
      previousPointRef.current = null;
      setCurrentPaceSecondsPerKm(null);
      setGpsSignal('weak');
      return;
    }
    const point = { latitude: location.coords.latitude, longitude: location.coords.longitude };
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
    const timestamp = location.timestamp;
    const previous = previousPointRef.current;
    if (!Number.isFinite(timestamp) || (previous && timestamp <= previous.timestamp)) return;
    setCurrentLocation(point);
    lastAcceptedLocationAtRef.current = Date.now();
    setGpsSignal('ready');
    const append = (next: RoutePoint) => {
      recordingRef.current.route = [...recordingRef.current.route, next];
      setRoute(recordingRef.current.route);
    };
    if (!previous || timestamp - previous.timestamp > GPS_STALE_AFTER_MS) {
      previousPointRef.current = { point, timestamp };
      append({ ...point, segmentStart: true });
      setCurrentPaceSecondsPerKm(null);
      return;
    }
    const segmentMeters = distanceBetween(previous.point, point);
    const seconds = (timestamp - previous.timestamp) / 1000;
    if (segmentMeters / seconds > MAX_REASONABLE_SPEED_METERS_PER_SECOND) {
      previousPointRef.current = null;
      setCurrentPaceSecondsPerKm(null);
      setGpsSignal('weak');
      return;
    }
    if (segmentMeters < 2) return;
    previousPointRef.current = { point, timestamp };
    append(point);
    recordingRef.current.distanceMeters += segmentMeters;
    setDistanceMeters(recordingRef.current.distanceMeters);
    setCurrentPaceSecondsPerKm((seconds / segmentMeters) * 1000);
  }, []);

  const prepareRecording = useCallback(async (resuming: boolean) => {
    if (preparingRef.current || (resuming ? statusRef.current !== 'paused' : !['idle', 'denied', 'error'].includes(statusRef.current))) return;
    stopWatching();
    const generation = generationRef.current;
    const valid = () => mountedRef.current && generation === generationRef.current;
    preparingRef.current = true;
    setPreparing(true);
    if (!resuming) changeStatus('requesting');
    try {
      if (!await Location.hasServicesEnabledAsync()) {
        if (valid()) { setGpsSignal('disabled'); if (!resuming) changeStatus('error'); }
        return;
      }
      const existing = await Location.getForegroundPermissionsAsync();
      if (!valid()) return;
      const permission = existing.granted ? existing : await Location.requestForegroundPermissionsAsync();
      if (!valid()) return;
      if (!permission.granted) {
        setGpsSignal('disabled');
        if (!resuming) changeStatus('denied');
        return;
      }
      setGpsSignal('acquiring');
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5_000 },
        (location) => { if (valid()) handleLocation(location); },
        () => { if (valid()) { setGpsSignal('weak'); pauseRecording('gps-error'); } },
      );
      if (!valid()) { watcher.remove(); return; }
      watcherRef.current = watcher;
      lastAcceptedLocationAtRef.current = null;
      startedAtRef.current = Date.now();
      setPauseReason(null);
      changeStatus('tracking');
    } catch {
      if (valid()) { setGpsSignal('weak'); setPauseReason('gps-error'); if (!resuming) changeStatus('error'); }
    } finally {
      if (valid()) { preparingRef.current = false; setPreparing(false); }
    }
  }, [changeStatus, handleLocation, pauseRecording, stopWatching]);

  const start: (activityType?: 'walk' | 'run') => Promise<void> = useCallback(() => prepareRecording(false), [prepareRecording]);
  const resume = useCallback(() => prepareRecording(true), [prepareRecording]);
  const pause = useCallback(() => pauseRecording('manual'), [pauseRecording]);

  const finish = useCallback((): FinishedActivity | null => {
    if (!['tracking', 'paused'].includes(statusRef.current)) return null;
    if (startedAtRef.current !== null) elapsedBeforeCurrentSegmentRef.current += Date.now() - startedAtRef.current;
    startedAtRef.current = null;
    stopWatching();
    setElapsedMs(elapsedBeforeCurrentSegmentRef.current);
    setGpsSignal('idle');
    changeStatus('finished');
    return { ...recordingRef.current, durationMs: elapsedBeforeCurrentSegmentRef.current };
  }, [changeStatus, stopWatching]);

  const reset = useCallback(() => {
    stopWatching();
    startedAtRef.current = null;
    elapsedBeforeCurrentSegmentRef.current = 0;
    lastAcceptedLocationAtRef.current = null;
    recordingRef.current = { distanceMeters: 0, route: [] };
    setElapsedMs(0); setDistanceMeters(0); setCurrentPaceSecondsPerKm(null);
    setCurrentLocation(null); setAccuracyMeters(null); setGpsSignal('idle'); setRoute([]); setPauseReason(null);
    changeStatus('idle');
  }, [changeStatus, stopWatching]);

  useEffect(() => {
    if (status !== 'tracking') return;
    const timer = setInterval(() => {
      if (startedAtRef.current !== null) setElapsedMs(elapsedBeforeCurrentSegmentRef.current + Date.now() - startedAtRef.current);
      const last = lastAcceptedLocationAtRef.current ?? startedAtRef.current;
      if (last !== null && Date.now() - last > GPS_STALE_AFTER_MS) {
        previousPointRef.current = null;
        setCurrentPaceSecondsPerKm(null);
        setGpsSignal('weak');
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') pauseRecording('background');
    });
    return () => subscription.remove();
  }, [pauseRecording]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; generationRef.current += 1; watcherRef.current?.remove(); };
  }, []);

  return { status, isPreparing, isRestoring: false, canResume: true, backgroundIssue: null as import('@/lib/background-activity').BackgroundIssue,
    recordedActivityType: null as 'walk' | 'run' | null, retryStop: () => {}, pauseReason, elapsedMs, distanceMeters, currentPaceSecondsPerKm, route, currentLocation, accuracyMeters, gpsSignal, start, pause, resume, finish, reset };
}
