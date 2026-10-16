const assert = require('node:assert/strict');
const test = require('node:test');
const { applyDaySteps, getWeekSteps, readTotals } = require('../lib/leaderboard-totals.js');

test('adds new days and replaces updated days without double counting', () => {
  const first = applyDaySteps({ allTimeSteps: 50000, days: {} }, { '2026-10-14': 4000 }, '2026-10-16');
  assert.deepEqual(first, { allTimeSteps: 54000, days: { '2026-10-14': 4000 } });

  const updated = applyDaySteps(first, { '2026-10-14': 6500, '2026-10-16': 1200 }, '2026-10-16');
  assert.deepEqual(updated, { allTimeSteps: 57700, days: { '2026-10-14': 6500, '2026-10-16': 1200 } });

  assert.deepEqual(applyDaySteps(updated, { '2026-10-14': 6500 }, '2026-10-16'), updated);
});

test('lowers totals when a day is corrected downward', () => {
  const totals = applyDaySteps({ allTimeSteps: 10000, days: { '2026-10-15': 10000 } }, { '2026-10-15': 7000 }, '2026-10-16');
  assert.equal(totals.allTimeSteps, 7000);
});

test('ignores future, invalid, and out-of-window days and prunes old ones', () => {
  const totals = applyDaySteps(
    { allTimeSteps: 9000, days: { '2026-09-01': 9000 } },
    { '2026-10-20': 5000, 'not-a-day': 5000, '2026-09-02': 5000 },
    '2026-10-16',
  );
  assert.deepEqual(totals, { allTimeSteps: 9000, days: {} });
});

test('sums only the requested week', () => {
  const totals = { allTimeSteps: 0, days: { '2026-10-11': 3000, '2026-10-12': 4000, '2026-10-16': 2500 } };
  assert.equal(getWeekSteps(totals, '2026-10-12'), 6500);
  assert.equal(getWeekSteps(totals, '2026-10-05'), 3000);
});

test('reads stored totals defensively', () => {
  assert.deepEqual(readTotals({ allTimeSteps: -5, days: { '2026-10-16': 12.7, bad: 4, '2026-10-15': -1 } }), {
    allTimeSteps: 0,
    days: { '2026-10-16': 12 },
  });
  assert.deepEqual(readTotals(undefined), { allTimeSteps: 0, days: {} });
});
