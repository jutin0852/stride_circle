import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { createHealthDataProvider } from '@/services/health-data';

export type StepTrackingStatus =
  | 'checking'
  | 'ready'
  | 'requesting'
  | 'tracking'
  | 'denied'
  | 'unavailable'
  | 'error';

type StepTrackingState = {
  todaySteps: number;
  status: StepTrackingStatus;
};

export function useStepTracking() {
  const provider = useMemo(() => createHealthDataProvider(), []);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const [state, setState] = useState<StepTrackingState>({
    todaySteps: 0,
    status: 'checking',
  });

  const stopWatching = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const refreshTodaySteps = useCallback(async () => {
    if (!provider.canReadDailyTotals) return;

    try {
      const end = new Date();
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);

      const steps = await provider.getDailySteps({ end, start });
      setState({ todaySteps: steps, status: 'tracking' });
    } catch {
      setState((current) => ({ ...current, status: 'error' }));
    }
  }, [provider]);

  const startWatching = useCallback(() => {
    stopWatching();

    subscriptionRef.current = provider.subscribeToStepUpdates(() => {
      void refreshTodaySteps();
    });
    setState((current) => ({ ...current, status: 'tracking' }));
    void refreshTodaySteps();
  }, [provider, refreshTodaySteps, stopWatching]);

  const checkAvailability = useCallback(async () => {
    try {
      const available = await provider.isAvailable();
      if (!available) {
        setState({ todaySteps: 0, status: 'unavailable' });
        return;
      }

      const permission = await provider.getPermissionStatus();
      if (permission.granted) {
        startWatching();
        return;
      }

      setState((current) => ({ ...current, status: 'ready' }));
    } catch {
      setState({ todaySteps: 0, status: 'error' });
    }
  }, [provider, startWatching]);

  const requestStepAccess = useCallback(async () => {
    setState((current) => ({ ...current, status: 'requesting' }));

    try {
      const permission = await provider.requestPermission();
      if (!permission.granted) {
        setState((current) => ({ ...current, status: 'denied' }));
        return;
      }

      startWatching();
    } catch {
      setState((current) => ({ ...current, status: 'error' }));
    }
  }, [provider, startWatching]);

  useEffect(() => {
    const availabilityTimer = setTimeout(() => {
      void checkAvailability();
    }, 0);

    return () => {
      clearTimeout(availabilityTimer);
      stopWatching();
    };
  }, [checkAvailability, stopWatching]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkAvailability();
      }
    });

    return () => subscription.remove();
  }, [checkAvailability]);

  return {
    openHealthSettings: provider.openHealthSettings,
    requestStepAccess,
    source: provider.source,
    todaySteps: state.todaySteps,
    status: state.status,
  };
}
