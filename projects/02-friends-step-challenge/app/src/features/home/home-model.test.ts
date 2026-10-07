import { describe, expect, it } from 'vitest';
import { getCircleDayStart, getCircleDeadline, getHomeHealth, getPersonalProgress, getStandingPreview } from './home-model';

describe('Home health and progress', () => {
  const input = { status: 'tracking', dateKey: '2026-10-05', today: '2026-10-05', steps: 0, savedSteps: null };
  it('distinguishes a confirmed zero from unavailable health data', () => {
    expect(getHomeHealth(input)).toEqual({ state: 'confirmed', steps: 0 });
    expect(getHomeHealth({ ...input, status: 'denied', savedSteps: 6240 })).toEqual({ state: 'unavailable', steps: null });
  });
  it('does not relabel yesterday’s sensor total as today', () => {
    expect(getHomeHealth({ ...input, dateKey: '2026-10-04', steps: 9000 })).toEqual({ state: 'unavailable', steps: null });
  });
  it('retains cached values as stale after a failed read', () => {
    expect(getHomeHealth({ ...input, status: 'error', savedSteps: 6240 })).toEqual({ state: 'stale', steps: 6240 });
  });
  it('never awards progress to unknown, invalid steps, or an unavailable goal', () => {
    expect(getPersonalProgress(null, 8000).goalMet).toBe(false);
    expect(getPersonalProgress(NaN, 8000).steps).toBeNull();
    expect(getPersonalProgress(8240, 0).goalMet).toBe(false);
    expect(getPersonalProgress(6240, 8000)).toEqual({ steps: 6240, percent: 78, remaining: 1760, goalMet: false });
  });
});
describe('Home circle standings', () => {
  it('keeps two leaders and the current user with their true rank', () => {
    expect(getStandingPreview({ a: 9000, b: 8000, c: 7000, me: 5000 }, ['a', 'b', 'c', 'me'], 'me').map(({ userId, rank }) => ({ userId, rank }))).toEqual([{ userId: 'a', rank: 1 }, { userId: 'b', rank: 2 }, { userId: 'me', rank: 4 }]);
  });
  it('keeps missing scores unranked and honors tied scores', () => {
    const preview = getStandingPreview({ a: 6000, b: 6000 }, ['a', 'b', 'me'], 'me');
    expect(preview.map(({ rank }) => rank)).toEqual([1, 1, null]);
    expect(preview[2].verifiedSteps).toBeNull();
  });
});
describe('Home competition deadline', () => {
  it('reads steps from the circle’s midnight, independent of the personal day', () => {
    expect(getCircleDayStart(new Date('2026-10-05T18:40:00Z'), 'Africa/Lagos').toISOString()).toBe('2026-10-04T23:00:00.000Z');
    expect(getCircleDayStart(new Date('2026-11-01T19:00:00Z'), 'America/New_York').toISOString()).toBe('2026-11-01T04:00:00.000Z');
  });
  it('uses the circle timezone', () => {
    expect(getCircleDeadline(new Date('2026-10-05T18:40:00Z'), 'Africa/Lagos')).toBe('Results in 4h 20m');
  });
  it('respects a 25-hour daylight saving competition day', () => {
    expect(getCircleDeadline(new Date('2026-11-01T04:00:00Z'), 'America/New_York')).toBe('Results in 25h 0m');
  });
});
