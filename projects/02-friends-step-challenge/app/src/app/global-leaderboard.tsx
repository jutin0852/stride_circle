import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { type GlobalLeaderboardPeriod } from '@/domain/global-leaderboard';
import { GlobalLeaderboardView } from '@/features/leaderboards/global-leaderboard-view';
import { useGlobalLeaderboard } from '@/hooks/use-global-leaderboard';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getAuthErrorMessage } from '@/lib/auth';
import { setGlobalLeaderboardVisibility } from '@/lib/global-leaderboard';

export default function GlobalLeaderboardRoute() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<GlobalLeaderboardPeriod>('week');
  const [retryKey, setRetryKey] = useState(0);
  const leaderboard = useGlobalLeaderboard(period, user?.uid, retryKey);
  const profile = useUserProfile(user);
  const [joining, setJoining] = useState(false);

  function join() {
    if (!user || joining) return;
    setJoining(true);
    void setGlobalLeaderboardVisibility({ userId: user.uid, visible: true })
      .catch((error) => Alert.alert('Could not join the leaderboard', getAuthErrorMessage(error)))
      .finally(() => setJoining(false));
  }

  return (
    <GlobalLeaderboardView
      currentUser={leaderboard.currentUser}
      entries={leaderboard.entries}
      generatedAt={leaderboard.generatedAt}
      joined={user && profile.status === 'ready' ? profile.globalLeaderboardVisible : undefined}
      joining={joining}
      onBack={() => router.back()}
      onChangePeriod={setPeriod}
      onJoin={join}
      onRetry={() => setRetryKey((current) => current + 1)}
      period={period}
      status={leaderboard.status}
    />
  );
}
