import { useEffect, useState } from 'react';

import {
  loadDailyStepHistory,
  type DailyStepHistoryRecord,
} from '@/lib/daily-steps';

type HistoryStatus = 'loading' | 'ready' | 'error';

type DailyStepHistory = {
  records: DailyStepHistoryRecord[];
  status: HistoryStatus;
};

export function useDailyStepHistory(userId: string | undefined, days = 7) {
  const [history, setHistory] = useState<DailyStepHistory>({
    records: [],
    status: 'loading',
  });

  useEffect(() => {
    if (!userId) return;

    const currentUserId = userId;
    let cancelled = false;

    async function loadHistory() {
      try {
        const records = await loadDailyStepHistory(currentUserId, days);
        if (!cancelled) setHistory({ records, status: 'ready' });
      } catch {
        if (!cancelled) setHistory({ records: [], status: 'error' });
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [days, userId]);

  return history;
}
