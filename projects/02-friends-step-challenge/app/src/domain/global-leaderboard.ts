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

/**
 * Competition ranks for entries already ordered by steps, highest first:
 * equal totals share a rank and the next distinct total skips ahead.
 */
export function rankByTotals<T extends { verifiedSteps: number }>(ordered: readonly T[]): (T & { rank: number })[] {
  return ordered.map((entry, index) => {
    let firstEqual = index;
    while (firstEqual > 0 && ordered[firstEqual - 1].verifiedSteps === entry.verifiedSteps) firstEqual -= 1;
    return { ...entry, rank: firstEqual + 1 };
  });
}

export function getGlobalLeaderboardBoardId(period: GlobalLeaderboardPeriod, now = new Date()) {
  if (period === 'all-time') return `${GLOBAL_LEADERBOARD_ACTIVITY}_all_time`;
  const weekKey = getWeekStartKey(getDateKeyInTimeZone(now, 'UTC'));
  return `${GLOBAL_LEADERBOARD_ACTIVITY}_week_${weekKey}`;
}
