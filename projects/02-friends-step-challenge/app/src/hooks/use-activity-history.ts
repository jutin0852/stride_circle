import { useCallback, useEffect, useState } from 'react';

import { type ActivityRecord, watchActivityHistory } from '@/lib/activities';

type ActivityHistory = { key: string; records: ActivityRecord[]; status: 'loading' | 'ready' | 'error' };

export function useActivityHistory(userId: string | undefined) {
  const [history, setHistory] = useState<ActivityHistory>({ key: '', records: [], status: 'loading' });
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? ''}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    return watchActivityHistory(
      userId,
      (records) => setHistory({ key, records, status: 'ready' }),
      () => setHistory({ key, records: [], status: 'error' }),
    );
  }, [key, userId]);

  const current: ActivityHistory = history.key === key ? history : { key, records: [], status: 'loading' };
  return { ...current, refresh };
}
