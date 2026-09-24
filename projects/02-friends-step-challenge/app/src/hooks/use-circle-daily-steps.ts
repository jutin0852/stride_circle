import { useEffect, useState } from 'react';

import { type CircleDailySteps, watchCircleDailySteps } from '@/lib/circles';
import { getLocalDateKey } from '@/lib/daily-steps';

type CircleDailyStepsState = {
  status: 'loading' | 'ready' | 'error';
  steps: CircleDailySteps;
};

export function useCircleDailySteps(circleId: string | undefined, dateKey?: string) {
  const [state, setState] = useState<CircleDailyStepsState>({
    status: 'loading',
    steps: {},
  });

  useEffect(() => {
    if (!circleId) return;

    return watchCircleDailySteps(
      circleId,
      dateKey ?? getLocalDateKey(),
      (steps) => setState({ status: 'ready', steps }),
      () => setState({ status: 'error', steps: {} }),
    );
  }, [circleId, dateKey]);

  return state;
}
