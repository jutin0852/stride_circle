import { useEffect, useState } from 'react';

import { DEFAULT_DAILY_STEP_GOAL, watchDailyStepGoal } from '@/lib/movement-goals';

type GoalState = { goal: number; status: 'loading' | 'ready' | 'error' };

export function useDailyStepGoal(userId: string | undefined) {
  const [state, setState] = useState<GoalState>({ goal: DEFAULT_DAILY_STEP_GOAL, status: 'loading' });

  useEffect(() => {
    if (!userId) return;

    return watchDailyStepGoal(
      userId,
      (goal) => setState({ goal, status: 'ready' }),
      () => setState((current) => ({ ...current, status: 'error' })),
    );
  }, [userId]);

  return state;
}
