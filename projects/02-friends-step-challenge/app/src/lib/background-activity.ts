import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { finishRecording, newRecording, pauseRecording, readRecording, recordLocations, resumeRecording, type RecordingSample, type RecordingSession } from '@/lib/activity-recording';

export const ACTIVITY_LOCATION_TASK = 'stride-circle-active-walk-v1';
export const ACTIVITY_STORAGE_KEY = 'stride:active-recording:v1';
export type BackgroundIssue = 'permission' | 'unavailable' | 'start' | 'storage' | 'stop' | null;
type Snapshot = { session: RecordingSession | null; isPreparing: boolean; issue: BackgroundIssue };

let snapshot: Snapshot = { session: null, isPreparing: false, issue: null };
let loaded = false;
let recovered = false;
let generation = 0;
let activeUser: string | null | undefined;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

async function load() {
  if (loaded) return;
  let session: RecordingSession | null;
  try { session = readRecording(await AsyncStorage.getItem(ACTIVITY_STORAGE_KEY)); }
  catch (error) { publish({ issue: 'storage' }); throw error; }
  loaded = true;
  recovered = session !== null;
  publish({ session });
}

function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const next = queue.catch(() => {}).then(async () => {
    try { await load(); } catch (error) { await stopSafely(); throw error; }
    return operation();
  });
  queue = next;
  return next;
}

async function commit(session: RecordingSession | null) {
  publish({ session });
  try {
    if (session) await AsyncStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(session));
    else await AsyncStorage.removeItem(ACTIVITY_STORAGE_KEY);
  } catch (error) { publish({ issue: 'storage' }); throw error; }
}

async function stopNative() {
  if (process.env.EXPO_OS === 'web') return;
  if (await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
  }
}

async function stopSafely() {
  try { await stopNative(); if (snapshot.issue === 'stop') publish({ issue: null }); return true; }
  catch { publish({ issue: 'stop' }); return false; }
}

export function getBackgroundRecording() { return snapshot; }
export function subscribeBackgroundRecording(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function restoreBackgroundRecording(userId: string) {
  if (activeUser !== userId) { generation++; publish({ isPreparing: false }); }
  activeUser = userId;
  return exclusive(async () => {
    const session = snapshot.session;
    if (session && session.userId !== userId) {
      generation++;
      let stopped = false;
      try { await commit(pauseRecording(session, Date.now(), 'recovered')); }
      finally { stopped = await stopSafely(); }
      if (!stopped) throw new Error('Could not stop previous account recording');
      await commit(null);
    } else if (session && recovered) {
      const running = session.status === 'tracking' && await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
      if (!running) {
        // If the OS ended recording, only retain observed time, never the entire closed-app gap.
        const end = session.startedAt === null ? Date.now() : Math.max(session.startedAt, session.lastTimestamp);
        await commit({ ...pauseRecording(session, end, 'recovered'), completedAt: session.completedAt });
      }
    } else if (!session) {
      // Clean up an orphan registration left by a storage failure or interrupted setup.
      if (!await stopSafely()) throw new Error('Could not stop stale recording');
    }
    recovered = false;
    publish({ issue: null });
  });
}

export async function beginBackgroundRecording(input: {
  userId: string; activityType: 'walk' | 'run'; resuming: boolean;
  confirmBackgroundAccess: () => Promise<boolean>;
}) {
  if (activeUser === undefined) activeUser = input.userId;
  if (activeUser !== input.userId) return;
  if (snapshot.isPreparing) return;
  const token = ++generation;
  const valid = () => token === generation && activeUser === input.userId;
  publish({ isPreparing: true, issue: null });
  try {
    const eligible = await exclusive(async () => {
      const session = snapshot.session;
      return input.resuming ? Boolean(session && session.userId === input.userId && session.status === 'paused' && session.completedAt === null)
        : session?.status !== 'tracking' && session?.status !== 'paused';
    });
    if (!valid() || !eligible) return;
    if (!await TaskManager.isAvailableAsync() || !await Location.isBackgroundLocationAvailableAsync()) {
      if (valid()) publish({ issue: 'unavailable' });
      return;
    }
    if (!await Location.hasServicesEnabledAsync()) { if (valid()) publish({ issue: 'start' }); return; }
    const foreground = await Location.getForegroundPermissionsAsync();
    if (!valid()) return;
    const foregroundAccess = foreground.granted ? foreground : await Location.requestForegroundPermissionsAsync();
    if (!valid()) return;
    if (!foregroundAccess.granted) { publish({ issue: 'permission' }); return; }
    const background = await Location.getBackgroundPermissionsAsync();
    if (!valid()) return;
    if (!background.granted) {
      if (!await input.confirmBackgroundAccess() || !valid()) return;
      const permission = await Location.requestBackgroundPermissionsAsync();
      if (!valid()) return;
      if (!permission.granted) { publish({ issue: 'permission' }); return; }
    }
    await exclusive(async () => {
      if (!valid()) return;
      if (!await stopSafely()) return;
      if (!valid()) return;
      const existing = snapshot.session;
      const session = input.resuming && existing ? resumeRecording(existing, Date.now())
        : newRecording(Crypto.randomUUID(), input.userId, input.activityType, Date.now());
      // Durable state exists before the native service can deliver a headless callback.
      await commit(session);
      if (!valid()) return;
      try {
        await Location.startLocationUpdatesAsync(ACTIVITY_LOCATION_TASK, {
          accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5_000,
          activityType: Location.ActivityType.Fitness, pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: { notificationTitle: 'Stride Circle is recording',
            notificationBody: 'Your route records with the phone locked. Open Stride Circle to pause or finish.', killServiceOnDestroy: true },
        });
        if (!valid()) await stopSafely();
      } catch {
        await commit(pauseRecording(session, session.startedAt!, 'gps-error'));
        publish({ issue: 'start' });
        await stopSafely();
      }
    });
  } catch {
    if (valid() && snapshot.issue === null) publish({ issue: 'start' });
    // A failed durable write must not leave an apparent tracking session.
    if (valid() && snapshot.session?.status === 'tracking') {
      publish({ session: pauseRecording(snapshot.session, Date.now(), 'gps-error') });
      await stopSafely();
    }
  } finally { if (valid()) publish({ isPreparing: false }); }
}

export function pauseBackgroundRecording(userId?: string) {
  if (userId && activeUser !== userId) return Promise.resolve();
  generation++;
  publish({ isPreparing: false });
  return exclusive(async () => {
    const session = snapshot.session;
    if (userId && session?.userId !== userId) return;
    if (session?.status === 'tracking') {
      try { await commit(pauseRecording(session, Date.now(), 'manual')); }
      finally { await stopSafely(); }
    } else await stopSafely();
  });
}

export function finishBackgroundRecording(userId?: string) {
  if (userId && activeUser !== userId) return Promise.resolve(null);
  generation++;
  publish({ isPreparing: false });
  return exclusive(async () => {
    const session = snapshot.session;
    if (userId && session?.userId !== userId) return null;
    if (!session || !['tracking', 'paused'].includes(session.status)) return null;
    const finished = finishRecording(session, Date.now());
    try { await commit(finished); }
    catch (error) { publish({ session: { ...pauseRecording(session, Date.now(), 'gps-error'), completedAt: finished.completedAt, completedDateKey: finished.completedDateKey } }); throw error; }
    finally { await stopSafely(); }
    return finished;
  });
}

export function resetBackgroundRecording(userId?: string) {
  if (userId && activeUser !== userId) return Promise.resolve();
  generation++;
  publish({ isPreparing: false });
  return exclusive(async () => {
    if (userId && snapshot.session?.userId !== userId) return;
    let stopped = false;
    try { if (snapshot.session) await commit(pauseRecording(snapshot.session, Date.now(), 'manual')); }
    finally { stopped = await stopSafely(); }
    if (!stopped) return;
    await commit(null);
    publish({ issue: null });
  });
}

export function retryBackgroundStop() {
  return exclusive(async () => {
    if (await stopSafely()) {
      if (activeUser && snapshot.session?.userId !== activeUser) await commit(null);
      publish({ issue: null });
    }
  });
}

export function stopBackgroundRecordingOnSignOut() {
  if (process.env.EXPO_OS === 'web') return Promise.resolve();
  activeUser = null;
  return pauseBackgroundRecording();
}

export function refreshBackgroundRecording() {
  return exclusive(async () => {
    const session = snapshot.session;
    if (snapshot.isPreparing || session?.status !== 'tracking') return;
    const [running, access] = await Promise.all([
      Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK), Location.getBackgroundPermissionsAsync(),
    ]);
    if (!running || !access.granted || !await Location.hasServicesEnabledAsync()) {
      const end = Math.max(session.startedAt ?? 0, session.lastTimestamp);
      try { await commit(pauseRecording(session, end, 'gps-error')); }
      finally { await stopSafely(); }
      if (!access.granted) publish({ issue: 'permission' });
      await stopSafely();
    }
  });
}

// Imported from the bundle entry, not a component: this also runs in a headless launch.
if (process.env.EXPO_OS !== 'web' && !TaskManager.isTaskDefined(ACTIVITY_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: RecordingSample[] }>(ACTIVITY_LOCATION_TASK, ({ data, error }) => {
    const received = snapshot.session;
    return exclusive(async () => {
      const session = snapshot.session;
      // Capturing the ID/segment prevents queued samples from an old walk entering a new one.
      if (received && (received.id !== session?.id || received.segment !== session.segment)) return;
      if (!session || session.status !== 'tracking') { await stopSafely(); return; }
      try {
        if (error) {
          await commit(pauseRecording(session, Math.max(session.startedAt ?? 0, session.lastTimestamp), 'gps-error'));
          await stopSafely();
        } else if (data?.locations?.length) await commit(recordLocations(session, data.locations));
      } catch {
        publish({ issue: 'storage', session: pauseRecording(snapshot.session ?? session, Date.now(), 'gps-error') });
        await stopSafely();
      }
    }).catch(async () => { publish({ issue: 'storage' }); await stopSafely(); });
  });
}
