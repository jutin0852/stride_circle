import { isValidDateKey, localDateKey, shiftDateKey, type StepDay } from '@/domain/walking-history';

export const STREAK_PROTECTION_AFTER_DAYS = 7;

export type StreakSummary = {
  currentStreak: number;
  bestStreak: number;
  goalMetToday: boolean;
  protectedDateKey: string | null;
  protectedDateKeys: string[];
};

/**
 * A completed day counts when its saved steps reach the goal. After seven
 * successful days, the first missed completed day is automatically protected.
 * Another protection is earned after seven more successful days.
 */
export function getStreakSummary(input: {
  goal: number;
  records: StepDay[];
  todaySteps: number;
  now?: Date;
}): StreakSummary {
  const todayKey = localDateKey(input.now ?? new Date());
  const records = input.records.filter((record) => isValidDateKey(record.dateKey) && record.dateKey <= todayKey && Number.isFinite(record.steps) && record.steps >= 0);
  const byDate = new Map(records.map((record) => [record.dateKey, record.steps]));
  const savedTodaySteps = byDate.get(todayKey) ?? 0;
  const goalMetToday = input.goal > 0 && Math.max(input.todaySteps, savedTodaySteps) >= input.goal;
  const earliest = records.map((record) => record.dateKey).sort()[0] ?? todayKey;

  let streak = 0;
  let bestStreak = 0;
  let successfulDaysSinceProtection = 0;
  let protectedDateKey: string | null = null;
  const protectedDateKeys: string[] = [];

  for (let dateKey = earliest; dateKey < todayKey; dateKey = shiftDateKey(dateKey, 1)) {
    const goalMet = input.goal > 0 && (byDate.get(dateKey) ?? 0) >= input.goal;

    if (goalMet) {
      streak += 1;
      successfulDaysSinceProtection += 1;
      bestStreak = Math.max(bestStreak, streak);
      continue;
    }

    if (successfulDaysSinceProtection >= STREAK_PROTECTION_AFTER_DAYS) {
      streak += 1;
      successfulDaysSinceProtection = 0;
      protectedDateKey = dateKey;
      protectedDateKeys.push(dateKey);
      bestStreak = Math.max(bestStreak, streak);
      continue;
    }

    streak = 0;
    successfulDaysSinceProtection = 0;
    protectedDateKey = null;
  }

  return {
    currentStreak: streak + (goalMetToday ? 1 : 0),
    bestStreak: Math.max(bestStreak, streak + (goalMetToday ? 1 : 0)),
    goalMetToday,
    protectedDateKey,
    protectedDateKeys,
  };
}
