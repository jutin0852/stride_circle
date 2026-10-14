const assert = require('node:assert/strict');
const test = require('node:test');
const { rankScores } = require('../lib/ranking.js');

test('sorts server scores deterministically and applies competition ranking', () => {
  const input = [
    { userId: 'c', verifiedSteps: 1200 },
    { userId: 'b', verifiedSteps: 2400 },
    { userId: 'a', verifiedSteps: 2400 },
    { userId: 'd', verifiedSteps: 500 },
  ];

  assert.deepEqual(rankScores(input), [
    { userId: 'a', verifiedSteps: 2400, isWinner: true, rank: 1 },
    { userId: 'b', verifiedSteps: 2400, isWinner: true, rank: 1 },
    { userId: 'c', verifiedSteps: 1200, isWinner: false, rank: 3 },
    { userId: 'd', verifiedSteps: 500, isWinner: false, rank: 4 },
  ]);
  assert.deepEqual(input.map(({ userId }) => userId), ['c', 'b', 'a', 'd']);
});
