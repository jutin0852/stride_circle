import { useEffect, useState } from 'react';
import { getLocalDateKey, watchStepHistory, type DailyStepHistoryRecord } from '@/lib/daily-steps';

type DailyStepHistory = { userId?: string; records: DailyStepHistoryRecord[]; status: 'loading' | 'ready' | 'error' };

export function useDailyStepHistory(userId: string | undefined, days = 7) {
  const [history, setHistory] = useState<DailyStepHistory>({ records: [], status: 'loading' });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - Math.max(0, Math.floor(days) - 1));
    try {
      unsubscribe = watchStepHistory(userId, { from: getLocalDateKey(from), to: getLocalDateKey(to) },
        (records) => { if (active) setHistory({ userId, records, status: 'ready' }); },
        () => { if (active) setHistory({ userId, records: [], status: 'error' }); },
      );
    } catch {
      void Promise.resolve().then(() => { if (active) setHistory({ userId, records: [], status: 'error' }); });
    }
    return () => { active = false; unsubscribe?.(); };
  }, [days, userId]);

  return history.userId === userId ? history : { records: [], status: 'loading' as const };
}
