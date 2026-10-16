import { getWeekStartKey, isDateKey } from './date-keys.js';

/**
 * Clients may only write step days inside this window (Firestore Rules allow
 * 15 days), so older days are final and need not be remembered per user.
 */
export const RECENT_DAY_WINDOW = 16;

export type LeaderboardTotals = {
  allTimeSteps: number;
  days: Record<string, number>;
};

function dateKeyDaysBefore(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function readTotals(value: unknown): LeaderboardTotals {
  const data = (value ?? {}) as { allTimeSteps?: unknown; days?: unknown };
  const days: Record<string, number> = {};
  if (data.days && typeof data.days === 'object') {
    for (const [dateKey, steps] of Object.entries(data.days)) {
      if (isDateKey(dateKey) && typeof steps === 'number' && Number.isFinite(steps) && steps >= 0) days[dateKey] = Math.floor(steps);
    }
  }
  const allTimeSteps = typeof data.allTimeSteps === 'number' && Number.isFinite(data.allTimeSteps) ? Math.max(0, Math.floor(data.allTimeSteps)) : 0;
  return { allTimeSteps, days };
}

/**
 * Applies the latest cumulative totals for changed days. Re-applying the same
 * day is idempotent because the stored day value is replaced, not added.
 */
export function applyDaySteps(totals: LeaderboardTotals, changes: Record<string, number>, todayKey: string): LeaderboardTotals {
  const oldestKept = dateKeyDaysBefore(todayKey, RECENT_DAY_WINDOW);
  const days = { ...totals.days };
  let allTimeSteps = totals.allTimeSteps;

  for (const [dateKey, rawSteps] of Object.entries(changes)) {
    if (!isDateKey(dateKey) || dateKey > todayKey || dateKey < oldestKept) continue;
    const steps = Math.max(0, Math.floor(rawSteps));
    allTimeSteps += steps - (days[dateKey] ?? 0);
    days[dateKey] = steps;
  }

  for (const dateKey of Object.keys(days)) {
    if (dateKey < oldestKept) delete days[dateKey];
  }

  return { allTimeSteps: Math.max(0, allTimeSteps), days };
}

export function getWeekSteps(totals: LeaderboardTotals, weekKey: string) {
  return Object.entries(totals.days).reduce((total, [dateKey, steps]) => getWeekStartKey(dateKey) === weekKey ? total + steps : total, 0);
}
