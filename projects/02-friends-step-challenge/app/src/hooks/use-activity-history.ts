import { useEffect, useState } from 'react';

import { type ActivityRecord, watchActivityHistory } from '@/lib/activities';

type ActivityHistory = { records: ActivityRecord[]; status: 'loading' | 'ready' | 'error' };

export function useActivityHistory(userId: string | undefined) {
  const [history, setHistory] = useState<ActivityHistory>({ records: [], status: 'loading' });

  useEffect(() => {
    if (!userId) return;
    return watchActivityHistory(
      userId,
      (records) => setHistory({ records, status: 'ready' }),
      () => setHistory({ records: [], status: 'error' }),
    );
  }, [userId]);

  return history;
}
