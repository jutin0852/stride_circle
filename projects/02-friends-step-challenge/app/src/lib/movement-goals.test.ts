import { describe, expect, it, vi } from 'vitest';

import { isValidDailyStepGoal, isValidWeeklyStepGoal } from './movement-goals';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ database: {}, requireFirebase: () => ({}) }));

describe('movement goal validation', () => {
  it.each([1_000, 6_000, 100_000])('accepts daily goal %i within the supported range', (goal) => {
    expect(isValidDailyStepGoal(goal)).toBe(true);
  });

  it.each([999, 100_001, 6_000.5, Number.NaN, '6000'])('rejects invalid daily goal %s', (goal) => {
    expect(isValidDailyStepGoal(goal)).toBe(false);
  });

  it.each([7_000, 42_000, 700_000])('accepts weekly goal %i within the supported range', (goal) => {
    expect(isValidWeeklyStepGoal(goal)).toBe(true);
  });

  it.each([6_999, 700_001, 42_000.5, Number.POSITIVE_INFINITY, '42000'])('rejects invalid weekly goal %s', (goal) => {
    expect(isValidWeeklyStepGoal(goal)).toBe(false);
  });
});
