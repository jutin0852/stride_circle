import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_DAILY_STEP_GOAL, watchDailyStepGoal } from '@/lib/movement-goals';

type GoalState = { key: string; goal: number; status: 'loading' | 'ready' | 'error' };

export function useDailyStepGoal(userId: string | undefined) {
  const [state, setState] = useState<GoalState>({ key: '', goal: DEFAULT_DAILY_STEP_GOAL, status: 'loading' });
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? ''}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;

    return watchDailyStepGoal(
      userId,
      (goal) => setState({ key, goal, status: 'ready' }),
      () => setState({ key, goal: DEFAULT_DAILY_STEP_GOAL, status: 'error' }),
    );
  }, [key, userId]);

  const current: GoalState = state.key === key ? state : { key, goal: DEFAULT_DAILY_STEP_GOAL, status: 'loading' };
  return { ...current, refresh };
}
