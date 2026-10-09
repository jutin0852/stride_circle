import { getDateKeyInTimeZone, getWeekStartKey } from '@/domain/dates';
import type { AvatarChoice } from '@/lib/avatar';

export const GLOBAL_LEADERBOARD_ACTIVITY = 'walk' as const;

export type GlobalLeaderboardPeriod = 'week' | 'all-time';

export type GlobalLeaderboardEntry = {
  avatar: AvatarChoice;
  displayName: string;
  rank: number;
  userId: string;
  verifiedSteps: number;
};

export function getGlobalLeaderboardBoardId(period: GlobalLeaderboardPeriod, now = new Date()) {
  if (period === 'all-time') return `${GLOBAL_LEADERBOARD_ACTIVITY}_all_time`;
  const weekKey = getWeekStartKey(getDateKeyInTimeZone(now, 'UTC'));
  return `${GLOBAL_LEADERBOARD_ACTIVITY}_week_${weekKey}`;
}
