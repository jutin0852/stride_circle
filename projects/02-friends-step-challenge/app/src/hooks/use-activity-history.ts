import { useCallback, useEffect, useState } from 'react';

import { type ActivityRecord, watchActivityHistory } from '@/lib/activities';

type ActivityHistory = { key: string; records: ActivityRecord[]; status: 'loading' | 'ready' | 'error' };

export function useActivityHistory(userId: string | undefined, dateKey?: string) {
  const [history, setHistory] = useState<ActivityHistory>({ key: '', records: [], status: 'loading' });
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? ''}:${dateKey ?? ''}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try { unsubscribe = watchActivityHistory(
      userId,
      (records) => { if (active) setHistory({ key, records, status: 'ready' }); },
      () => { if (active) setHistory({ key, records: [], status: 'error' }); },
      dateKey,
    ); } catch { void Promise.resolve().then(() => { if (active) setHistory({ key, records: [], status: 'error' }); }); }
    return () => { active = false; unsubscribe?.(); };
  }, [key, userId, dateKey]);

  const current: ActivityHistory = history.key === key ? history : { key, records: [], status: 'loading' };
  return { ...current, refresh };
}
