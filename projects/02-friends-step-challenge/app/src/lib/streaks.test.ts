import { describe, expect, it } from 'vitest';
import { getStreakSummary } from './streaks';

const now = new Date(2026, 9, 3, 19, 30);
const sevenDays = [
  { dateKey: '2026-09-25', steps: 6000 },
  { dateKey: '2026-09-26', steps: 6000 },
  { dateKey: '2026-09-27', steps: 6000 },
  { dateKey: '2026-09-28', steps: 6000 },
  { dateKey: '2026-09-29', steps: 6000 },
  { dateKey: '2026-09-30', steps: 6000 },
  { dateKey: '2026-10-01', steps: 6000 },
];

describe('personal walking streak', () => {
  it('starts with today and does not require an older record', () => {
    expect(getStreakSummary({ records: [], goal: 6000, todaySteps: 6000, now })).toMatchObject({ currentStreak: 1, bestStreak: 1, goalMetToday: true });
  });
  it('does not break the streak before today finishes', () => {
    const records = [{ dateKey: '2026-10-01', steps: 6000 }, { dateKey: '2026-10-02', steps: 6000 }];
    expect(getStreakSummary({ records, goal: 6000, todaySteps: 2, now }).currentStreak).toBe(2);
  });
  it('includes saved steps today even before the live counter loads', () => {
    expect(getStreakSummary({ records: [{ dateKey: '2026-10-03', steps: 6000 }], goal: 6000, todaySteps: 0, now }).goalMetToday).toBe(true);
  });
  it('earns a protection only after seven successful days', () => {
    expect(getStreakSummary({ records: sevenDays, goal: 6000, todaySteps: 0, now })).toMatchObject({ currentStreak: 8, bestStreak: 8, protectedDateKey: '2026-10-02', protectedDateKeys: ['2026-10-02'] });
  });
  it('cannot reuse protection on a second missed day and preserves the best', () => {
    expect(getStreakSummary({ records: sevenDays, goal: 6000, todaySteps: 0, now: new Date(2026, 9, 4, 8) })).toMatchObject({ currentStreak: 0, bestStreak: 8, protectedDateKey: null, protectedDateKeys: ['2026-10-02'] });
  });
  it('does not protect a missed day after only six successful days', () => {
    expect(getStreakSummary({ records: sevenDays.slice(1), goal: 6000, todaySteps: 0, now })).toMatchObject({ currentStreak: 0, bestStreak: 6, protectedDateKeys: [] });
  });
  it('ignores future records and invalid totals', () => {
    expect(getStreakSummary({ records: [{ dateKey: '2026-10-04', steps: 9000 }, { dateKey: '2026-10-03', steps: NaN }], goal: 6000, todaySteps: 0, now })).toMatchObject({ currentStreak: 0, bestStreak: 0 });
  });
  it('counts the same days at morning and evening', () => {
    const records = [{ dateKey: '2026-03-07', steps: 6000 }, { dateKey: '2026-03-08', steps: 6000 }];
    expect(getStreakSummary({ records, goal: 6000, todaySteps: 0, now: new Date(2026, 2, 9, 1) }).currentStreak).toBe(2);
    expect(getStreakSummary({ records, goal: 6000, todaySteps: 0, now: new Date(2026, 2, 9, 23) }).currentStreak).toBe(2);
  });
});
