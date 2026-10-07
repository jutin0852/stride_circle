import { describe, expect, it } from 'vitest';
import { weeklyTrail } from './weekly-trail';

describe('real weekly trail geometry', () => {
  it('raises a waypoint as its saved steps increase', () => {
    const low = weeklyTrail([{ dateKey: '2026-10-06', steps: 2000 }], '2026-10-06', 8000);
    const high = weeklyTrail([{ dateKey: '2026-10-06', steps: 6000 }], '2026-10-06', 8000);
    expect(high.points[6].y).toBeLessThan(low.points[6].y);
    expect(high.path).not.toBe(low.path);
  });
  it('uses the same seven dates and aligned columns as the labels', () => {
    const { points } = weeklyTrail([], '2026-10-06', 8000);
    expect(points[0].dateKey).toBe('2026-09-30');
    expect(points[6].dateKey).toBe('2026-10-06');
    expect(points.map((point) => point.x)).toEqual([22, 66, 110, 154, 198, 242, 286]);
  });
  it('renders no fabricated trail for missing history, but recognizes saved zero', () => {
    expect(weeklyTrail([], '2026-10-06', 8000).path).toBe('');
    const { points, path } = weeklyTrail([{ dateKey: '2026-10-06', steps: 0 }], '2026-10-06', 8000);
    expect(points[6]).toMatchObject({ saved: true, steps: 0, y: 64 });
    expect(path).toBe('M 286 64');
  });
  it('does not connect across a day with no saved history', () => {
    const { path } = weeklyTrail([{ dateKey: '2026-10-04', steps: 4000 }, { dateKey: '2026-10-06', steps: 6000 }], '2026-10-06', 8000);
    expect(path.match(/M /g)).toHaveLength(2);
    expect(path).not.toContain('C ');
  });
  it('keeps equal totals level instead of drawing decorative hills', () => {
    const records = ['2026-10-04', '2026-10-05', '2026-10-06'].map((dateKey) => ({ dateKey, steps: 4000 }));
    const { points, path } = weeklyTrail(records, '2026-10-06', 8000);
    expect(points.slice(4).map((point) => point.y)).toEqual([40, 40, 40]);
    expect(path).toContain('C 264 40 264 40 286 40');
  });
  it('bounds extreme totals and unavailable goals without NaN coordinates', () => {
    const { points, path } = weeklyTrail([{ dateKey: '2026-10-05', steps: 1000000 }, { dateKey: '2026-10-06', steps: 0 }], '2026-10-06', NaN);
    expect(points.every((point) => point.y >= 16 && point.y <= 64)).toBe(true);
    expect(path).not.toMatch(/NaN|Infinity/);
  });
});
