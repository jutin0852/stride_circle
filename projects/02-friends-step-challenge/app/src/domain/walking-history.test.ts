import { describe, expect, it } from 'vitest';
import { isValidDateKey, monthCells, monthCellsSundayFirst, monthRange, nextWalkingMilestone, sevenDayRecap, sevenDayRhythm, shiftDateKey, shiftMonth } from './walking-history';

describe('walking calendar', () => {
  it('rejects malformed and impossible saved dates', () => {
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('not-a-date')).toBe(false);
    expect(isValidDateKey('2026-10-03')).toBe(true);
  });
  it('starts on Monday and includes leap day', () => {
    const cells = monthCells('2024-02-12');
    expect(cells.slice(0, 4)).toEqual([null, null, null, '2024-02-01']);
    expect(cells).toContain('2024-02-29');
    expect(cells).toHaveLength(35);
    expect(cells[34]).toBeNull();
  });
  it('uses six rows when a month starts late in the week', () => {
    expect(monthCells('2026-08-01')).toHaveLength(42);
  });
  it('supports a Sunday-first presentation without changing the Monday-first helper', () => {
    expect(monthCellsSundayFirst('2026-10-01').findIndex(Boolean)).toBe(4);
    expect(monthCells('2026-10-01').findIndex(Boolean)).toBe(3);
  });
  it('moves cleanly across years', () => {
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01');
    expect(shiftMonth('2026-12-10', 1)).toBe('2027-01-01');
    expect(monthRange('2026-02-18')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
  it('shifts dates across daylight-saving boundaries without using elapsed hours', () => {
    expect(shiftDateKey('2026-03-08', 1)).toBe('2026-03-09');
    expect(shiftDateKey('2026-11-01', -1)).toBe('2026-10-31');
  });
});

describe('seven-day recap', () => {
  it('includes today but not old or future records', () => {
    expect(sevenDayRecap([
      { dateKey: '2026-09-26', steps: 9000 },
      { dateKey: '2026-09-27', steps: 3000 },
      { dateKey: '2026-10-02', steps: 0 },
      { dateKey: '2026-10-03', steps: 7000 },
      { dateKey: '2026-10-04', steps: 12000 },
    ], '2026-10-03')).toEqual({ totalSteps: 10000, activeDays: 2, savedDays: 3, bestDaySteps: 7000 });
  });
  it('does not invent saved days for an empty account', () => {
    expect(sevenDayRecap([], '2026-10-03')).toEqual({ totalSteps: 0, activeDays: 0, savedDays: 0, bestDaySteps: 0 });
  });
  it('fills missing rhythm days with zeroes', () => {
    expect(sevenDayRhythm([{ dateKey: '2026-10-03', steps: 1200 }], '2026-10-03')).toEqual([
      { dateKey: '2026-09-27', steps: 0 },
      { dateKey: '2026-09-28', steps: 0 },
      { dateKey: '2026-09-29', steps: 0 },
      { dateKey: '2026-09-30', steps: 0 },
      { dateKey: '2026-10-01', steps: 0 },
      { dateKey: '2026-10-02', steps: 0 },
      { dateKey: '2026-10-03', steps: 1200 },
    ]);
  });
});

describe('walking milestones', () => {
  it('advances at exact thresholds and finishes after a year', () => {
    expect(nextWalkingMilestone(0)?.days).toBe(7);
    expect(nextWalkingMilestone(7)?.days).toBe(30);
    expect(nextWalkingMilestone(30)?.days).toBe(100);
    expect(nextWalkingMilestone(100)?.days).toBe(365);
    expect(nextWalkingMilestone(365)).toBeNull();
  });
});
