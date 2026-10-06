import { rankScores } from '@/domain/ranking';
import { getDateKeyInTimeZone } from '@/domain/dates';

export type HomeHealthState = 'loading' | 'confirmed' | 'stale' | 'unavailable';

export function getCircleDayStart(now: Date, timeZone: string) {
  const dateKey = getDateKeyInTimeZone(now, timeZone);
  let low = now.getTime() - 30 * 60 * 60 * 1000;
  let high = now.getTime();
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (getDateKeyInTimeZone(new Date(middle), timeZone) === dateKey) high = middle;
    else low = middle;
  }
  return new Date(high);
}

export function getHomeHealth(input: {
  status: string; dateKey: string | null; today: string; steps: number; savedSteps: number | null;
}): { state: HomeHealthState; steps: number | null } {
  if (input.status === 'tracking' && input.dateKey === input.today && Number.isFinite(input.steps) && input.steps >= 0) {
    return { state: 'confirmed', steps: input.steps };
  }
  const cached = input.savedSteps !== null && Number.isFinite(input.savedSteps) && input.savedSteps >= 0 ? input.savedSteps : null;
  if (input.status === 'denied' || input.status === 'unavailable' || input.status === 'ready') return { state: 'unavailable', steps: null };
  if (cached !== null) return { state: 'stale', steps: cached };
  return { state: input.status === 'checking' || input.status === 'requesting' ? 'loading' : 'unavailable', steps: null };
}

/** Search the next date boundary, including 23/25-hour DST days. */
export function getCircleDeadline(now: Date, timeZone: string) {
  const dateKey = getDateKeyInTimeZone(now, timeZone);
  let low = now.getTime();
  let high = low + 30 * 60 * 60 * 1000;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (getDateKeyInTimeZone(new Date(middle), timeZone) === dateKey) low = middle;
    else high = middle;
  }
  const minutes = Math.max(1, Math.ceil((low - now.getTime()) / 60000));
  return `Results in ${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60}m`;
}

export function getPersonalProgress(steps: number | null, goal: number) {
  const valid = steps !== null && Number.isFinite(steps) && steps >= 0;
  const validGoal = Number.isFinite(goal) && goal > 0;
  return {
    steps: valid ? steps : null,
    percent: valid && validGoal ? Math.min(100, Math.floor(steps / goal * 100)) : null,
    remaining: valid && validGoal ? Math.max(0, goal - steps) : null,
    goalMet: valid && validGoal && steps >= goal,
  };
}

/** Missing scores are unranked, not zero. Keep the leaders and the current user. */
export function getStandingPreview(scores: Record<string, number>, memberIds: string[], userId: string) {
  const rankings = rankScores(memberIds.flatMap((id) => {
    const steps = scores[id];
    return Number.isFinite(steps) && steps >= 0 ? [{ userId: id, verifiedSteps: steps }] : [];
  }));
  const leaders = rankings.slice(0, 3);
  const yours = rankings.find((score) => score.userId === userId);
  if (memberIds.includes(userId) && !leaders.some((score) => score.userId === userId)) {
    return [...leaders.slice(0, 2), yours ?? { userId, verifiedSteps: null, rank: null, isWinner: false }];
  }
  return leaders;
}

export function ordinal(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  return `${rank}${rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th'}`;
}
