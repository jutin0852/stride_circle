const assert = require('node:assert/strict');
const test = require('node:test');
const { getWeekStartKey, isDateKey } = require('../lib/date-keys.js');

test('accepts valid calendar dates, including leap days', () => {
  assert.equal(isDateKey('2024-02-29'), true);
  assert.equal(isDateKey('2026-10-11'), true);
});

test('rejects impossible calendar dates instead of normalizing them', () => {
  assert.equal(isDateKey('2025-02-29'), false);
  assert.equal(isDateKey('2026-02-31'), false);
  assert.equal(isDateKey('2026-04-31'), false);
});

test('rejects malformed and out-of-range date keys', () => {
  assert.equal(isDateKey('2026-13-01'), false);
  assert.equal(isDateKey('26-01-01'), false);
  assert.equal(isDateKey('2026/10/11'), false);
  assert.equal(isDateKey(null), false);
});

test('uses the UTC Monday boundary for the leaderboard week', () => {
  assert.equal(getWeekStartKey('2026-10-12'), '2026-10-12');
  assert.equal(getWeekStartKey('2026-10-11'), '2026-10-05');
  assert.equal(getWeekStartKey('2026-01-04'), '2025-12-29');
});
