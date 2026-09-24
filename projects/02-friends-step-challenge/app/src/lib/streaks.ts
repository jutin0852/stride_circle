import { getLocalDateKey, type DailyStepHistoryRecord } from '@/lib/daily-steps';

export const STREAK_PROTECTION_AFTER_DAYS = 7;

export type StreakSummary = {
  currentStreak: number;
  goalMetToday: boolean;
  protectedDateKey: string | null;
};

function dateBefore(date: Date, count: number) {
  const result = new Date(date);
  result.setDate(date.getDate() - count);
  return result;
}

/**
 * A completed day counts when its saved steps reach the goal. After seven
 * successful days, the first missed completed day is automatically protected.
 * Another protection is earned after seven more successful days.
 */
export function getStreakSummary(input: {
  goal: number;
  records: DailyStepHistoryRecord[];
  todaySteps: number;
  now?: Date;
}): StreakSummary {
  const now = input.now ?? new Date();
  const todayKey = getLocalDateKey(now);
  const byDate = new Map(input.records.map((record) => [record.dateKey, record.steps]));
  const savedTodaySteps = byDate.get(todayKey) ?? 0;
  const goalMetToday = Math.max(input.todaySteps, savedTodaySteps) >= input.goal;
  const pastRecords = input.records.filter((record) => record.dateKey !== todayKey);
  const earliest = pastRecords.reduce<Date | null>((current, record) => {
    const [year, month, day] = record.dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return !current || date < current ? date : current;
  }, null);

  if (!earliest) return { currentStreak: goalMetToday ? 1 : 0, goalMetToday, protectedDateKey: null };

  let streak = 0;
  let successfulDaysSinceProtection = 0;
  let protectedDateKey: string | null = null;
  const yesterday = dateBefore(now, 1);
  const numberOfPastDays = Math.ceil((yesterday.getTime() - earliest.getTime()) / 86_400_000);

  for (let offset = numberOfPastDays; offset >= 0; offset -= 1) {
    const date = dateBefore(yesterday, offset);
    const dateKey = getLocalDateKey(date);
    const goalMet = (byDate.get(dateKey) ?? 0) >= input.goal;

    if (goalMet) {
      streak += 1;
      successfulDaysSinceProtection += 1;
      continue;
    }

    if (successfulDaysSinceProtection >= STREAK_PROTECTION_AFTER_DAYS) {
      streak += 1;
      successfulDaysSinceProtection = 0;
      protectedDateKey = dateKey;
      continue;
    }

    streak = 0;
    successfulDaysSinceProtection = 0;
    protectedDateKey = null;
  }

  return {
    currentStreak: streak + (goalMetToday ? 1 : 0),
    goalMetToday,
    protectedDateKey,
  };
}
