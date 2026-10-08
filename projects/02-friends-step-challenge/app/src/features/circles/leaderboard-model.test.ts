import { describe, expect, it } from 'vitest';

import { getWeekDateKeys } from '@/domain/dates';

import { aggregateCircleSteps, getRankMovement } from './leaderboard-model';

describe('circle leaderboard periods', () => {
  it('builds Monday-to-Sunday periods for the week selector', () => {
    expect(getWeekDateKeys('2026-10-08')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('aggregates only the circle members and ignores invalid entries', () => {
    expect(aggregateCircleSteps(
      ['2026-10-05', '2026-10-06'],
      {
        '2026-10-05': { a: 1000, b: 800, outsider: 900, invalid: -1 },
        '2026-10-06': { a: 1200, b: 700 },
      },
      ['a', 'b'],
    )).toEqual({ a: 2200, b: 1500 });
  });

  it('reports movement as the previous rank minus the current rank', () => {
    expect(getRankMovement(
      { a: 400, b: 900, c: 200 },
      { a: 900, b: 400, c: 200 },
    )).toEqual({ a: -1, b: 1, c: 0 });
  });
});
