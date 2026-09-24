import { useCallback, useEffect, useState } from 'react';

import {
  selectCircle,
  type CircleDetails,
  type CircleSummary,
  watchCircleDetails,
  watchUserCircles,
} from '@/lib/circles';

type CircleState = {
  circles: CircleSummary[];
  details: CircleDetails | null;
  selectedCircleId: string | null;
  status: 'loading' | 'ready' | 'error';
};

export function useCurrentCircle(userId: string | undefined) {
  const [circleState, setCircleState] = useState<CircleState>({
    circles: [],
    details: null,
    selectedCircleId: null,
    status: 'loading',
  });

  useEffect(() => {
    if (!userId) return;

    return watchUserCircles(
      userId,
      (circles, selectedCircleId) =>
        setCircleState((current) => ({
          ...current,
          circles,
          details: current.selectedCircleId === selectedCircleId ? current.details : null,
          selectedCircleId,
          status: 'ready',
        })),
      () => setCircleState((current) => ({ ...current, status: 'error' })),
    );
  }, [userId]);

  useEffect(() => {
    return watchCircleDetails(
      circleState.selectedCircleId ?? undefined,
      (details) => setCircleState((current) => ({ ...current, details })),
      () => setCircleState((current) => ({ ...current, details: null, status: 'error' })),
    );
  }, [circleState.selectedCircleId]);

  const changeSelectedCircle = useCallback(
    async (circleId: string) => {
      if (!userId) return;
      await selectCircle({ circleId, userId });
    },
    [userId],
  );

  return { ...circleState, selectCircle: changeSelectedCircle };
}
