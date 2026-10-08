import { useEffect, useState } from 'react';

import { type GlobalLeaderboardPeriod } from '@/domain/global-leaderboard';
import { watchGlobalLeaderboard, type GlobalLeaderboardSnapshot } from '@/lib/global-leaderboard';

type GlobalLeaderboardState = GlobalLeaderboardSnapshot & {
  status: 'loading' | 'ready' | 'error';
};

type InternalGlobalLeaderboardState = GlobalLeaderboardState & {
  key: string;
};

const EMPTY_SNAPSHOT: GlobalLeaderboardSnapshot = {
  currentUser: null,
  entries: [],
  generatedAt: null,
};

export function useGlobalLeaderboard(period: GlobalLeaderboardPeriod, userId: string | undefined, retryKey = 0): GlobalLeaderboardState {
  const requestKey = `${period}:${userId ?? ''}:${retryKey}`;
  const [state, setState] = useState<InternalGlobalLeaderboardState>({ ...EMPTY_SNAPSHOT, key: requestKey, status: 'loading' });

  useEffect(() => {
    if (!userId) return undefined;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    try {
      unsubscribe = watchGlobalLeaderboard({
        onChange: (snapshot) => setState({ ...snapshot, key: requestKey, status: 'ready' }),
        onError: () => setState((current) => current.key === requestKey ? { ...current, status: 'error' } : current),
        period,
        userId,
      });
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setState((current) => current.key === requestKey ? { ...current, status: 'error' } : current);
      });
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [period, requestKey, userId]);

  return state.key === requestKey ? state : { ...EMPTY_SNAPSHOT, status: 'loading' };
}
