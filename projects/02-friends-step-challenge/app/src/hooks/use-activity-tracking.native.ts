import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState } from 'react-native';

import { GPS_STALE_MS, recordingElapsed } from '@/lib/activity-recording';
import { beginBackgroundRecording, finishBackgroundRecording, getBackgroundRecording, pauseBackgroundRecording,
  refreshBackgroundRecording, resetBackgroundRecording, restoreBackgroundRecording, retryBackgroundStop, subscribeBackgroundRecording } from '@/lib/background-activity';
import type { ActivityStatus, FinishedActivity, GpsSignalStatus } from './use-activity-tracking';

export type { ActivityStatus, FinishedActivity, GpsSignalStatus, PauseReason, RoutePoint } from './use-activity-tracking';

function confirmBackgroundAccess() {
  return new Promise<boolean>((resolve) => Alert.alert('Keep recording with your phone locked',
    'Allow background location so your route, distance, and walking time continue while your phone is locked. Recording stops when you pause or finish. This does not share your location with other people.',
    [{ text: 'Not now', style: 'cancel', onPress: () => resolve(false) }, { text: 'Continue', onPress: () => resolve(true) }],
    { cancelable: false }));
}

export function useActivityTracking(userId?: string) {
  const [value, setValue] = useState(getBackgroundRecording);
  const [restoredUser, setRestoredUser] = useState<string | null>(null);
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let active = true;
    const update = () => { if (active) { setValue(getBackgroundRecording()); setNow(Date.now()); } };
    const unsubscribe = subscribeBackgroundRecording(update);
    if (userId) void restoreBackgroundRecording(userId).then(() => {
      if (active) { setRestoreFailed(false); setRestoredUser(userId); update(); }
    }).catch(() => { if (active) { setRestoreFailed(true); setRestoredUser(userId); update(); } });
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') { update(); void refreshBackgroundRecording().catch(update); }
    });
    // Leaving this screen must not stop a walk; only explicit controls/sign-out stop it.
    return () => { active = false; unsubscribe(); subscription.remove(); };
  }, [userId]);

  useEffect(() => {
    if (value.session?.status !== 'tracking' || value.session.userId !== userId) return;
    const timer = setInterval(() => { setValue(getBackgroundRecording()); setNow(Date.now()); }, 1000);
    return () => clearInterval(timer);
  }, [userId, value.session?.status, value.session?.userId]);

  const start = useCallback((activityType: 'walk' | 'run' = 'walk') => userId
    ? beginBackgroundRecording({ userId, activityType, resuming: false, confirmBackgroundAccess }) : Promise.resolve(), [userId]);
  const resume = useCallback(() => userId
    ? beginBackgroundRecording({ userId, activityType: getBackgroundRecording().session?.activityType ?? 'walk', resuming: true, confirmBackgroundAccess }) : Promise.resolve(), [userId]);
  const finish = useCallback(async (): Promise<FinishedActivity | null> => {
    if (!userId) return null;
    const session = await finishBackgroundRecording(userId).catch(() => null);
    if (!session) return null;
    return { route: session.route, distanceMeters: session.distanceMeters, durationMs: session.elapsedMs,
      activityId: session.id, activityType: session.activityType, userId: session.userId, dateKey: session.completedDateKey! };
  }, [userId]);
  const pause = useCallback(() => { if (userId) void pauseBackgroundRecording(userId).catch(() => {}); }, [userId]);
  const reset = useCallback(() => { if (userId) void resetBackgroundRecording(userId).catch(() => {}); }, [userId]);
  const retryStop = useCallback(() => { void retryBackgroundStop().catch(() => {}); }, []);

  const session = value.session?.userId === userId ? value.session : null;
  const issue = value.issue;
  const isRestoring = Boolean(userId && restoredUser !== userId);
  const stale = session?.status === 'tracking' && now - (session.lastTimestamp || session.startedAt || now) > GPS_STALE_MS;
  const status: ActivityStatus = session?.status ?? (value.isPreparing ? 'requesting'
    : issue === 'permission' ? 'denied' : issue || restoreFailed ? 'error' : 'idle');
  const gpsSignal: GpsSignalStatus = issue === 'permission' ? 'disabled' : stale ? 'weak' : session?.gpsSignal ?? 'idle';

  return { status, isPreparing: value.isPreparing || isRestoring, isRestoring, canResume: session?.completedAt === null, pauseReason: session?.pauseReason ?? null,
    elapsedMs: session ? recordingElapsed(session, now) : 0, distanceMeters: session?.distanceMeters ?? 0,
    currentPaceSecondsPerKm: stale ? null : session?.currentPaceSecondsPerKm ?? null,
    route: session?.route ?? [], currentLocation: session?.currentLocation ?? null, accuracyMeters: session?.accuracyMeters ?? null,
    gpsSignal, backgroundIssue: issue, recordedActivityType: session?.activityType ?? null, start, pause, resume, finish, reset, retryStop };
}
