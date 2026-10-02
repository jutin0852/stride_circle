import { useEffect, useState } from 'react';

import { type CircleDailySteps, watchCircleDailySteps } from '@/lib/circles';
import { getLocalTimeZone } from '@/lib/daily-steps';
import { getDateKeyInTimeZone } from '@/domain/dates';

type CircleDailyStepsState = {
  status: 'loading' | 'ready' | 'error';
  steps: CircleDailySteps;
};

export function useCircleDailySteps(circleId: string | undefined, dateKey?: string, timeZone?: string) {
  const [state, setState] = useState<CircleDailyStepsState>({
    status: 'loading',
    steps: {},
  });

  useEffect(() => {
    if (!circleId) return;

    return watchCircleDailySteps(
      circleId,
      dateKey ?? getDateKeyInTimeZone(new Date(), timeZone ?? getLocalTimeZone()),
      (steps) => setState({ status: 'ready', steps }),
      () => setState({ status: 'error', steps: {} }),
    );
  }, [circleId, dateKey, timeZone]);

  return state;
}
