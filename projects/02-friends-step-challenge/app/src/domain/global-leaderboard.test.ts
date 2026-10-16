import { describe, expect, it } from 'vitest';

import { getGlobalLeaderboardBoardId, rankByTotals } from './global-leaderboard';

describe('global leaderboard ranks', () => {
  it('gives tied totals the same rank and skips the next rank', () => {
    expect(rankByTotals([
      { userId: 'a', verifiedSteps: 9000 },
      { userId: 'b', verifiedSteps: 7000 },
      { userId: 'c', verifiedSteps: 7000 },
      { userId: 'd', verifiedSteps: 4000 },
    ]).map(({ rank }) => rank)).toEqual([1, 2, 2, 4]);
  });
});

describe('global leaderboard periods', () => {
  it('uses the same UTC week key for every user', () => {
    expect(getGlobalLeaderboardBoardId('week', new Date('2026-10-11T23:59:00.000Z'))).toBe('walk_week_2026-10-05');
    expect(getGlobalLeaderboardBoardId('week', new Date('2026-10-12T00:00:00.000Z'))).toBe('walk_week_2026-10-12');
  });

  it('keeps the all-time board stable across weeks', () => {
    expect(getGlobalLeaderboardBoardId('all-time', new Date('2026-10-11T23:59:00.000Z'))).toBe('walk_all_time');
    expect(getGlobalLeaderboardBoardId('all-time', new Date('2027-01-01T00:00:00.000Z'))).toBe('walk_all_time');
  });
});
