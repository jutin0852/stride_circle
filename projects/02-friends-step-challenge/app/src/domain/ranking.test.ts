import { describe, expect, it } from 'vitest';

import { rankScores, totalVerifiedSteps } from './ranking';

describe('rankScores', () => {
  it('orders scores by verified steps and assigns competition ranks', () => {
    expect(rankScores([
      { userId: 'c', verifiedSteps: 1200 },
      { userId: 'a', verifiedSteps: 2400 },
      { userId: 'b', verifiedSteps: 2400 },
      { userId: 'd', verifiedSteps: 500 },
    ])).toEqual([
      { userId: 'a', verifiedSteps: 2400, isWinner: true, rank: 1 },
      { userId: 'b', verifiedSteps: 2400, isWinner: true, rank: 1 },
      { userId: 'c', verifiedSteps: 1200, isWinner: false, rank: 3 },
      { userId: 'd', verifiedSteps: 500, isWinner: false, rank: 4 },
    ]);
  });

  it('does not mutate the input collection', () => {
    const input = [{ userId: 'b', verifiedSteps: 2 }, { userId: 'a', verifiedSteps: 3 }];
    rankScores(input);
    expect(input.map((score) => score.userId)).toEqual(['b', 'a']);
  });
});

describe('totalVerifiedSteps', () => {
  it('totals a weekly projection', () => {
    expect(totalVerifiedSteps([{ userId: 'a', verifiedSteps: 1200 }, { userId: 'b', verifiedSteps: 800 }])).toBe(2000);
  });
});
