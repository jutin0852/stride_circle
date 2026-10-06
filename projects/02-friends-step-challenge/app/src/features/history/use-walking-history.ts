import { useCallback, useEffect, useState } from 'react';

import { monthRange } from '@/domain/walking-history';
import { watchStepHistory, type DailyStepHistoryRecord } from '@/lib/daily-steps';

export type HistoryLoadState = 'loading' | 'ready' | 'error';
type HistoryData = { key: string; records: DailyStepHistoryRecord[]; status: HistoryLoadState };

export function useWalkingHistory(userId: string | undefined, month: string | null) {
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<HistoryData>({ key: '', records: [], status: 'loading' });
  const key = `${userId ?? ''}:${month ?? 'overview'}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    const onError = () => setData({ key, records: [], status: 'error' });
    try {
      return watchStepHistory(userId, month ? monthRange(month) : null,
        (records) => setData({ key, records, status: 'ready' }), onError);
    } catch {
      onError();
    }
  }, [key, month, userId]);

  const current: HistoryData = data.key === key ? data : { key, records: [], status: 'loading' };
  return { ...current, refresh, refreshing: revision > 0 && current.status === 'loading' };
}
