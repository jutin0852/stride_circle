import { useMemo } from 'react';

import { useWalkingHistory } from '@/features/history/use-walking-history';
import { getStreakSummary } from '@/lib/streaks';

export function usePersonalStreak(input: { goal: number; todaySteps: number; userId: string | undefined }) {
  const history = useWalkingHistory(input.userId, null);
  const summary = useMemo(
    () => getStreakSummary({ goal: input.goal, records: history.records, todaySteps: input.todaySteps }),
    [history.records, input.goal, input.todaySteps],
  );

  return { ...history, summary };
}
