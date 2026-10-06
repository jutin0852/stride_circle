import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createHealthDataProvider } from '@/services/health-data';
import type { HealthDataBackgroundMode, HealthDataSource } from '@/services/health-data/types';
import { getLocalDateKey } from '@/lib/daily-steps';

export type StepTrackingStatus =
  | 'checking'
  | 'ready'
  | 'requesting'
  | 'tracking'
  | 'denied'
  | 'unavailable'
  | 'error';

type StepTrackingState = {
  backgroundMode: HealthDataBackgroundMode;
  dateKey: string | null;
  source: HealthDataSource;
  status: StepTrackingStatus;
  todaySteps: number;
};

const READ_INTERVAL_MS = 60_000;

export function useStepTracking() {
  const provider = useMemo(() => createHealthDataProvider(), []);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const watchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lifecycleRef = useRef(0);
  const pendingReadRef = useRef(false);
  const readInFlightRef = useRef<Promise<void> | null>(null);
  const readVersionRef = useRef(0);
  const appliedReadVersionRef = useRef(0);
  const availabilityInFlightRef = useRef<Promise<void> | null>(null);
  const statusRef = useRef<StepTrackingStatus>('checking');
  const refreshTodayStepsRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const [state, setState] = useState<StepTrackingState>(() => ({
    backgroundMode: provider.backgroundMode,
    dateKey: null,
    source: provider.source,
    status: 'checking',
    todaySteps: 0,
  }));

  const stopWatching = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    watchingRef.current = false;
    pendingReadRef.current = false;
    lifecycleRef.current += 1;
  }, []);

  const refreshTodaySteps = useCallback(() => {
    pendingReadRef.current = true;
    const lifecycle = lifecycleRef.current;
    const existingRead = readInFlightRef.current;
    if (existingRead) return existingRead;

    const run = async () => {
      while (pendingReadRef.current && mountedRef.current && lifecycleRef.current === lifecycle) {
        pendingReadRef.current = false;
        const version = ++readVersionRef.current;
        const end = new Date();
        const start = new Date(end);
        start.setHours(0, 0, 0, 0);

        try {
          const steps = await provider.getDailySteps({ end, start });
          if (!mountedRef.current || lifecycleRef.current !== lifecycle || version < appliedReadVersionRef.current) continue;

          appliedReadVersionRef.current = version;
          setState({
            backgroundMode: provider.backgroundMode,
            dateKey: getLocalDateKey(end),
            source: provider.source,
            status: 'tracking',
            todaySteps: steps,
          });
        } catch {
          // If another health event arrived while this read was in flight,
          // allow the newer read to decide the visible state.
          if (mountedRef.current && lifecycleRef.current === lifecycle && !pendingReadRef.current) {
            setState((current) => ({ ...current, backgroundMode: provider.backgroundMode, source: provider.source, status: 'error' }));
          }
        }
      }
    };

    const read = run().finally(() => {
      if (readInFlightRef.current === read) readInFlightRef.current = null;
      if (pendingReadRef.current && mountedRef.current && lifecycleRef.current === lifecycle) {
        void refreshTodayStepsRef.current();
      }
    });
    readInFlightRef.current = read;
    return read;
  }, [provider]);

  useEffect(() => {
    refreshTodayStepsRef.current = refreshTodaySteps;
  }, [refreshTodaySteps]);

  const startWatching = useCallback(() => {
    if (watchingRef.current) {
      void refreshTodaySteps();
      return;
    }

    watchingRef.current = true;
    subscriptionRef.current = provider.subscribeToStepUpdates(() => refreshTodaySteps());
    void refreshTodaySteps();
  }, [provider, refreshTodaySteps]);

  const checkAvailability = useCallback(() => {
    const existingCheck = availabilityInFlightRef.current;
    if (existingCheck) return existingCheck;

    const check = (async () => {
      try {
        const available = await provider.isAvailable();
        if (!available || !provider.canReadDailyTotals) {
          stopWatching();
          setState({
            backgroundMode: provider.backgroundMode,
            dateKey: null,
            source: provider.source,
            status: 'unavailable',
            todaySteps: 0,
          });
          return;
        }

        const permission = await provider.getPermissionStatus();
        if (permission.granted || permission.status === 'unknown') {
          setState((current) => ({ ...current, backgroundMode: provider.backgroundMode, source: provider.source, status: 'checking' }));
          startWatching();
          return;
        }

        stopWatching();
        setState((current) => ({
          ...current,
          backgroundMode: provider.backgroundMode,
          source: provider.source,
          status: permission.status === 'denied' ? 'denied' : 'ready',
        }));
      } catch {
        setState({
          backgroundMode: provider.backgroundMode,
          dateKey: null,
          source: provider.source,
          status: 'error',
          todaySteps: 0,
        });
      }
    })().finally(() => {
      if (availabilityInFlightRef.current === check) availabilityInFlightRef.current = null;
    });

    availabilityInFlightRef.current = check;
    return check;
  }, [provider, startWatching, stopWatching]);

  const requestStepAccess = useCallback(async () => {
    setState((current) => ({ ...current, status: 'requesting' }));
    try {
      const permission = await provider.requestPermission();
      if (!permission.granted) {
        stopWatching();
        setState((current) => ({ ...current, status: 'denied' }));
        return;
      }
      startWatching();
    } catch {
      setState((current) => ({ ...current, status: 'error' }));
    }
  }, [provider, startWatching, stopWatching]);

  useEffect(() => {
    const availabilityTimer = setTimeout(() => void checkAvailability(), 0);
    return () => clearTimeout(availabilityTimer);
  }, [checkAvailability]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopWatching();
    };
  }, [stopWatching]);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void checkAvailability();
    });
    return () => subscription.remove();
  }, [checkAvailability]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && statusRef.current === 'tracking') {
        void refreshTodaySteps();
      }
    }, READ_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshTodaySteps]);

  return {
    backgroundMode: state.backgroundMode,
    getDailySteps: provider.getDailySteps,
    openHealthSettings: provider.openHealthSettings,
    requestStepAccess,
    source: state.source,
    dateKey: state.dateKey,
    todaySteps: state.todaySteps,
    status: state.status,
  };
}
