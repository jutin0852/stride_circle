import { useEffect, useState } from 'react';

import { type CircleDetails, watchCircleDetails } from '@/lib/circles';

type CircleDetailsState = {
  details: CircleDetails | null;
  status: 'loading' | 'ready' | 'error';
};

export function useCircleDetails(circleId: string | undefined) {
  const [state, setState] = useState<CircleDetailsState>({ details: null, status: 'loading' });

  useEffect(() => {
    if (!circleId) return;

    return watchCircleDetails(
      circleId,
      (details) => setState({ details, status: 'ready' }),
      () => setState({ details: null, status: 'error' }),
    );
  }, [circleId]);

  return state;
}
