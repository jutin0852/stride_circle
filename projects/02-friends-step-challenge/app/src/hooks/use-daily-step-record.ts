import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getCircleDayStart } from '@/features/home/home-model';
import { getDateKeyInTimeZone } from '@/domain/dates';
import { saveCircleDailySteps } from '@/lib/circles';
import { getLocalDateKey, loadDailySteps, saveDailySteps } from '@/lib/daily-steps';
import {
  getPendingDailyStepSync,
  removePendingDailyStepSync,
  savePendingDailyStepSync,
  type PendingDailyStepSync,
} from '@/services/health-data/daily-step-sync-queue';
import type { HealthDataSource } from '@/services/health-data';

type DailyStepSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

const SYNC_DELAY_MS = 15_000;
const SYNC_MAX_WAIT_MS = 60_000;

type DailyStepSyncSnapshot = PendingDailyStepSync & {
  readSteps?: (input: { start: Date; end: Date }) => Promise<number>;
};

export function useDailyStepRecord(input: {
  circleId: string | undefined;
  shouldSave: boolean;
  source?: HealthDataSource | 'ios-pedometer';
  steps: number;
  userId: string | undefined;
  dateKey?: string;
  circleTimeZone?: string;
  circleDateKey?: string;
  readSteps?: (input: { start: Date; end: Date }) => Promise<number>;
}) {
  const dateKey = input.dateKey ?? getLocalDateKey();
  const key = `${input.userId ?? ''}:${dateKey}`;
  const [recordKey, setRecordKey] = useState('');
  const recordKeyRef = useRef('');
  const [savedSteps, setSavedSteps] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<DailyStepSyncStatus>('idle');
  const latestSyncKeyRef = useRef<string | null>(null);
  const pendingSnapshotRef = useRef<DailyStepSyncSnapshot | null>(null);
  const queuedSnapshotsRef = useRef<DailyStepSyncSnapshot[]>([]);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const trailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const flushSyncRef = useRef<() => void>(() => undefined);

  const clearSyncTimers = useCallback(() => {
    if (trailingTimerRef.current) clearTimeout(trailingTimerRef.current);
    if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
    trailingTimerRef.current = null;
    maxWaitTimerRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearSyncTimers();
    };
  }, [clearSyncTimers]);

  useEffect(() => {
    const userId = input.userId;
    if (!userId) return;

    let cancelled = false;
    void Promise.allSettled([
      loadDailySteps(userId, dateKey),
      getPendingDailyStepSync(userId, dateKey),
    ]).then(([serverResult, pendingResult]) => {
      if (cancelled) return;

      const serverSteps = serverResult.status === 'fulfilled' ? serverResult.value : null;
      const pendingSteps = pendingResult.status === 'fulfilled' ? pendingResult.value[0]?.steps ?? null : null;
      recordKeyRef.current = key;
      setSavedSteps(pendingSteps ?? serverSteps);
      setRecordKey(key);
      setSyncStatus(serverResult.status === 'rejected' && pendingSteps === null ? 'error' : 'idle');
    });

    return () => {
      cancelled = true;
    };
  }, [dateKey, input.userId, key]);

  const syncSnapshot = useCallback(async (snapshot: DailyStepSyncSnapshot) => {
    await saveDailySteps({
      dateKey: snapshot.dateKey,
      source: snapshot.source,
      steps: snapshot.steps,
      userId: snapshot.userId,
    });

    if (mountedRef.current && snapshot.userId === input.userId && snapshot.dateKey === dateKey) {
      const sameRecord = recordKeyRef.current === key;
      recordKeyRef.current = key;
      setRecordKey(key);
      setSavedSteps((current) => sameRecord ? Math.max(current ?? 0, snapshot.steps) : snapshot.steps);
    }

    if (!snapshot.circleId) return;

    const end = new Date();
    const circleDateKey = snapshot.circleTimeZone
      ? getDateKeyInTimeZone(end, snapshot.circleTimeZone)
      : snapshot.circleDateKey;

    // This snapshot belongs to a previous competition day. Keep the personal
    // record, but do not write it into the current circle day.
    if (snapshot.circleDateKey && snapshot.circleDateKey !== circleDateKey) return;

    let circleSteps = snapshot.steps;
    if (snapshot.circleTimeZone && snapshot.circleDateKey !== snapshot.dateKey && snapshot.readSteps) {
      // Only perform a second cumulative read when the circle day is genuinely
      // different from the user's local day. The common case reuses the read
      // that produced the personal total.
      circleSteps = await snapshot.readSteps({
        start: getCircleDayStart(end, snapshot.circleTimeZone),
        end,
      });
    }

    await saveCircleDailySteps({
      circleId: snapshot.circleId,
      dateKey: circleDateKey,
      steps: circleSteps,
      userId: snapshot.userId,
    });
  }, [dateKey, input.userId, key]);

  const flushSync = useCallback(() => {
    clearSyncTimers();
    if (syncInFlightRef.current) return;

    const snapshot = queuedSnapshotsRef.current.shift() ?? pendingSnapshotRef.current;
    if (snapshot && pendingSnapshotRef.current === snapshot) pendingSnapshotRef.current = null;
    if (!snapshot) return;

    if (mountedRef.current) setSyncStatus('saving');

    const operation = (async () => {
      const { readSteps: _readSteps, ...pendingSnapshot } = snapshot;
      let queued = false;

      try {
        // Queue before the network write so a process death or offline gap
        // cannot lose the latest cumulative total between those two steps.
        await savePendingDailyStepSync(pendingSnapshot);
        queued = true;
      } catch {
        // Continue with the network attempt; the server may still be online
        // even if local storage is temporarily unavailable.
      }

      try {
        await syncSnapshot(snapshot);
        if (queued) await removePendingDailyStepSync(pendingSnapshot);
        latestSyncKeyRef.current = `${snapshot.userId}:${snapshot.dateKey}:${snapshot.circleId ?? 'private'}:${snapshot.circleDateKey ?? ''}:${snapshot.source ?? 'unknown'}:${snapshot.steps}`;
        if (mountedRef.current && snapshot.userId === input.userId && snapshot.dateKey === dateKey) {
          setSyncStatus('saved');
        }
      } catch {
        // Persist the latest cumulative total locally. Firebase's web SDK does
        // not provide durable Firestore persistence in this React Native setup,
        // so the explicit outbox is what survives a process restart/offline gap.
        if (!queued) {
          try {
            await savePendingDailyStepSync(pendingSnapshot);
          } catch {
            // The visible error still tells the user that the latest total was
            // not saved when local storage is unavailable as well.
          }
        }
        if (mountedRef.current) setSyncStatus('error');
      }
    })();

    syncInFlightRef.current = operation;
    void operation.finally(() => {
      if (syncInFlightRef.current === operation) syncInFlightRef.current = null;
      if ((queuedSnapshotsRef.current.length || pendingSnapshotRef.current) && mountedRef.current) flushSyncRef.current();
    });
  }, [clearSyncTimers, dateKey, input.userId, syncSnapshot]);

  useEffect(() => {
    flushSyncRef.current = flushSync;
  }, [flushSync]);

  useEffect(() => {
    const userId = input.userId;
    if (!userId || !input.shouldSave) return;

    const syncKey = `${key}:${input.circleId ?? 'private'}:${input.circleDateKey ?? ''}:${input.source ?? 'unknown'}:${input.steps}`;
    if (latestSyncKeyRef.current === syncKey) return;

    const snapshot: DailyStepSyncSnapshot = {
      circleDateKey: input.circleDateKey,
      circleId: input.circleId,
      circleTimeZone: input.circleTimeZone,
      dateKey,
      readSteps: input.readSteps,
      source: input.source,
      steps: input.steps,
      updatedAt: Date.now(),
      userId,
    };
    const previousSnapshot = pendingSnapshotRef.current;
    if (previousSnapshot && (previousSnapshot.userId !== snapshot.userId || previousSnapshot.dateKey !== snapshot.dateKey)) {
      queuedSnapshotsRef.current.push(previousSnapshot);
    }
    pendingSnapshotRef.current = snapshot;

    if (trailingTimerRef.current) clearTimeout(trailingTimerRef.current);
    trailingTimerRef.current = setTimeout(flushSync, SYNC_DELAY_MS);
    if (!maxWaitTimerRef.current) maxWaitTimerRef.current = setTimeout(flushSync, SYNC_MAX_WAIT_MS);
    if (queuedSnapshotsRef.current.length && !syncInFlightRef.current) flushSyncRef.current();
  }, [dateKey, flushSync, input.circleDateKey, input.circleId, input.circleTimeZone, input.readSteps, input.shouldSave, input.source, input.steps, input.userId, key]);

  useEffect(() => {
    const userId = input.userId;
    if (!userId) return;

    const flushPending = (isResume = false) => {
      void getPendingDailyStepSync(userId, dateKey).then((entries) => {
        const entry = entries[0];
        const currentSnapshot = pendingSnapshotRef.current;
        if (entry && !syncInFlightRef.current && (!currentSnapshot || entry.updatedAt >= currentSnapshot.updatedAt)) {
          pendingSnapshotRef.current = { ...entry, readSteps: input.readSteps };
          flushSync();
          return;
        }
        if (isResume && pendingSnapshotRef.current && !syncInFlightRef.current) flushSync();
      });
    };

    flushPending();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') flushPending(true);
    });
    return () => subscription.remove();
  }, [dateKey, flushSync, input.readSteps, input.userId]);

  return recordKey === key ? { savedSteps, syncStatus } : { savedSteps: null, syncStatus: 'idle' as const };
}
