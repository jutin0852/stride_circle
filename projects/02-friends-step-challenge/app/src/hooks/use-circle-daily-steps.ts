import { useCallback, useEffect, useState } from 'react';

import { type CircleDailySteps, watchCircleDailySteps } from '@/lib/circles';
import { getLocalTimeZone } from '@/lib/daily-steps';
import { getDateKeyInTimeZone } from '@/domain/dates';

type CircleDailyStepsState = {
  key: string;
  status: 'loading' | 'ready' | 'error';
  steps: CircleDailySteps;
};

export function useCircleDailySteps(circleId: string | undefined, dateKey?: string, timeZone?: string) {
  const resolvedDate = dateKey ?? getDateKeyInTimeZone(new Date(), timeZone ?? getLocalTimeZone());
  const [revision, setRevision] = useState(0);
  const key = `${circleId ?? ''}:${resolvedDate}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const [state, setState] = useState<CircleDailyStepsState>({
    key: '',
    status: 'loading',
    steps: {},
  });

  useEffect(() => {
    if (!circleId) return;

    return watchCircleDailySteps(
      circleId,
      resolvedDate,
      (steps) => setState({ key, status: 'ready', steps }),
      () => setState({ key, status: 'error', steps: {} }),
    );
  }, [circleId, key, resolvedDate]);

  const current: CircleDailyStepsState = state.key === key ? state : { key, status: 'loading', steps: {} };
  return { ...current, refresh };
}
