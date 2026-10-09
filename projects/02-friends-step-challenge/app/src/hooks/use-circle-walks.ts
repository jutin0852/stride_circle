import { useCallback, useEffect, useState } from 'react';

import { watchUpcomingCircleWalks, type CircleWalkPlan } from '@/data/firebase/circle-walk-repository';

type CircleWalkState = { plans: CircleWalkPlan[]; status: 'loading' | 'ready' | 'error' };

export function useCircleWalks(circleId: string | undefined) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<CircleWalkState>({ plans: [], status: 'loading' });
  useEffect(() => {
    if (!circleId) return;
    return watchUpcomingCircleWalks(
      circleId,
      (plans) => setState({ plans, status: 'ready' }),
      () => setState({ plans: [], status: 'error' }),
    );
  }, [circleId, revision]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, refresh };
}
