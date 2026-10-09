import { useState } from 'react';
import { router } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { type GlobalLeaderboardPeriod } from '@/domain/global-leaderboard';
import { GlobalLeaderboardView } from '@/features/leaderboards/global-leaderboard-view';
import { useGlobalLeaderboard } from '@/hooks/use-global-leaderboard';

export default function GlobalLeaderboardRoute() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<GlobalLeaderboardPeriod>('week');
  const [retryKey, setRetryKey] = useState(0);
  const leaderboard = useGlobalLeaderboard(period, user?.uid, retryKey);

  return (
    <GlobalLeaderboardView
      currentUser={leaderboard.currentUser}
      entries={leaderboard.entries}
      generatedAt={leaderboard.generatedAt}
      onBack={() => router.back()}
      onChangePeriod={setPeriod}
      onRetry={() => setRetryKey((current) => current + 1)}
      period={period}
      status={leaderboard.status}
    />
  );
}
