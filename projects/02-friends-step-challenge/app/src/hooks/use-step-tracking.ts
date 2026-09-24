import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Pedometer } from 'expo-sensors';

const isIOS = process.env.EXPO_OS === 'ios';

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
  const subscriptionRef = useRef<ReturnType<typeof Pedometer.watchStepCount> | null>(null);
  const [state, setState] = useState<StepTrackingState>({
    todaySteps: 0,
    status: 'checking',
  });

  const stopWatching = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const refreshTodaySteps = useCallback(async () => {
    if (!isIOS) return;

    try {
      const end = new Date();
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(start, end);
      setState({ todaySteps: result.steps, status: 'tracking' });
    } catch {
      setState((current) => ({ ...current, status: 'error' }));
    }
  }, []);

  const startWatching = useCallback(() => {
    stopWatching();

    subscriptionRef.current = Pedometer.watchStepCount(({ steps }) => {
      if (isIOS) {
        void refreshTodaySteps();
        return;
      }

      setState({ todaySteps: steps, status: 'tracking' });
    });
    setState((current) => ({ ...current, status: 'tracking' }));
    void refreshTodaySteps();
  }, [refreshTodaySteps, stopWatching]);

  const checkAvailability = useCallback(async () => {
    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) {
        setState({ todaySteps: 0, status: 'unavailable' });
        return;
      }

      const permission = await Pedometer.getPermissionsAsync();
      if (permission.granted) {
        startWatching();
        return;
      }

      setState((current) => ({ ...current, status: 'ready' }));
    } catch {
      setState({ todaySteps: 0, status: 'error' });
    }
  }, [startWatching]);

  const requestStepAccess = useCallback(async () => {
    setState((current) => ({ ...current, status: 'requesting' }));

    try {
      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) {
        setState((current) => ({ ...current, status: 'denied' }));
        return;
      }

      startWatching();
    } catch {
      setState((current) => ({ ...current, status: 'error' }));
    }
  }, [startWatching]);

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
    requestStepAccess,
    todaySteps: state.todaySteps,
    status: state.status,
  };
}
