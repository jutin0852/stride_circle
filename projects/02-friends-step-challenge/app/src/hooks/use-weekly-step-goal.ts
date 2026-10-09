import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_WEEKLY_STEP_GOAL, watchWeeklyStepGoal } from '@/lib/movement-goals';

type WeeklyGoalState = { key: string; goal: number; status: 'loading' | 'ready' | 'error' };

export function useWeeklyStepGoal(userId: string | undefined) {
  const [state, setState] = useState<WeeklyGoalState>({ key: '', goal: DEFAULT_WEEKLY_STEP_GOAL, status: 'loading' });
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? ''}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    return watchWeeklyStepGoal(
      userId,
      (goal) => setState({ key, goal, status: 'ready' }),
      () => setState({ key, goal: DEFAULT_WEEKLY_STEP_GOAL, status: 'error' }),
    );
  }, [key, userId]);

  const current = state.key === key ? state : { key, goal: DEFAULT_WEEKLY_STEP_GOAL, status: 'loading' as const };
  return { ...current, refresh };
}
