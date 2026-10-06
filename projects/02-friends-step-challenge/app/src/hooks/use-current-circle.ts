import { useCallback, useEffect, useState } from 'react';

import {
  selectCircle,
  type CircleDetails,
  type CircleSummary,
  watchCircleDetails,
  watchUserCircles,
} from '@/lib/circles';

type CircleState = {
  userId?: string;
  circles: CircleSummary[];
  details: CircleDetails | null;
  selectedCircleId: string | null;
  status: 'loading' | 'ready' | 'error';
};

export function useCurrentCircle(userId: string | undefined) {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
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
          userId,
          circles,
          details: current.userId === userId && current.selectedCircleId === selectedCircleId ? current.details : null,
          selectedCircleId,
          status: 'ready',
        })),
      () => setCircleState({ userId, circles: [], details: null, selectedCircleId: null, status: 'error' }),
    );
  }, [revision, userId]);

  useEffect(() => {
    return watchCircleDetails(
      circleState.userId === userId ? circleState.selectedCircleId ?? undefined : undefined,
      (details) => setCircleState((current) => ({ ...current, details })),
      () => setCircleState((current) => ({ ...current, details: null, status: 'error' })),
    );
  }, [circleState.selectedCircleId, circleState.userId, revision, userId]);

  const changeSelectedCircle = useCallback(
    async (circleId: string) => {
      if (!userId) return;
      await selectCircle({ circleId, userId });
    },
    [userId],
  );

  const current = circleState.userId === userId ? circleState : { circles: [], details: null, selectedCircleId: null, status: 'loading' as const };
  return { ...current, refresh, selectCircle: changeSelectedCircle };
}
