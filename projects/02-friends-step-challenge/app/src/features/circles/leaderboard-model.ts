import { rankScores, type ScoreInput } from '@/domain/ranking';
import type { CircleDailySteps } from '@/lib/circles';

export function aggregateCircleSteps(
  dateKeys: readonly string[],
  stepsByDate: Record<string, CircleDailySteps>,
  memberIds: readonly string[],
) {
  const totals = Object.fromEntries(memberIds.map((memberId) => [memberId, 0]));

  dateKeys.forEach((dateKey) => {
    const dailySteps = stepsByDate[dateKey] ?? {};
    Object.entries(dailySteps).forEach(([userId, steps]) => {
      if (!(userId in totals) || !Number.isFinite(steps) || steps < 0) return;
      totals[userId] += Math.floor(steps);
    });
  });

  return totals;
}

export function getRankMovement(
  currentTotals: Record<string, number>,
  previousTotals: Record<string, number>,
) {
  const currentRanks = new Map(rankScores(toScores(currentTotals)).map((score) => [score.userId, score.rank]));
  const previousRanks = new Map(rankScores(toScores(previousTotals)).map((score) => [score.userId, score.rank]));
  const movement: Record<string, number> = {};

  currentRanks.forEach((rank, userId) => {
    const previousRank = previousRanks.get(userId);
    if (previousRank !== undefined) movement[userId] = previousRank - rank;
  });

  return movement;
}

function toScores(totals: Record<string, number>): ScoreInput[] {
  return Object.entries(totals).map(([userId, verifiedSteps]) => ({ userId, verifiedSteps }));
}
