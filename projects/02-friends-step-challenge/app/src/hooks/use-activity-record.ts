import { useEffect, useState } from 'react';

import { type ActivityRecord, watchActivityRecord } from '@/lib/activities';

type ActivityRecordState = { record: ActivityRecord | null; status: 'loading' | 'ready' | 'error' };

export function useActivityRecord(userId: string | undefined, activityId: string | undefined) {
  const [state, setState] = useState<ActivityRecordState>({ record: null, status: 'loading' });

  useEffect(() => {
    if (!userId || !activityId) return;
    return watchActivityRecord(
      userId,
      activityId,
      (record) => setState({ record, status: 'ready' }),
      () => setState({ record: null, status: 'error' }),
    );
  }, [activityId, userId]);

  return state;
}
