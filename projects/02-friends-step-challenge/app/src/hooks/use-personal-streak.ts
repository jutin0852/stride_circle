import { useMemo } from 'react';

import { useDailyStepHistory } from '@/hooks/use-daily-step-history';
import { getStreakSummary } from '@/lib/streaks';

export function usePersonalStreak(input: { goal: number; todaySteps: number; userId: string | undefined }) {
  const history = useDailyStepHistory(input.userId, 60);
  const summary = useMemo(
    () => getStreakSummary({ goal: input.goal, records: history.records, todaySteps: input.todaySteps }),
    [history.records, input.goal, input.todaySteps],
  );

  return { ...history, summary };
}
