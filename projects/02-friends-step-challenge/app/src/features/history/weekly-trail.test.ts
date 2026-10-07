import { describe, expect, it } from 'vitest';
import { isHorizontalTrailGesture, trailDayAtX, trailPositionAtX, weeklyTrail } from './weekly-trail';

describe('reference-styled walking track with measured daily heights', () => {
  it('maps responsive touch columns to their aligned dates and clamps edges', () => {
    for (const width of [280, 354, 600]) {
      expect(Array.from({ length: 7 }, (_, i) => trailDayAtX((i + 0.5) * width / 7, width))).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(trailDayAtX(-100, width)).toBe(0);
      expect(trailDayAtX(width + 100, width)).toBe(6);
    }
    expect(trailDayAtX(NaN, 0)).toBe(0);
  });
  it('claims deliberate horizontal drags but leaves vertical scrolling alone', () => {
    expect(isHorizontalTrailGesture(20, 2)).toBe(true);
    expect(isHorizontalTrailGesture(2, 20)).toBe(false);
    expect(isHorizontalTrailGesture(7, 0)).toBe(false);
    expect(isHorizontalTrailGesture(10, 10)).toBe(false);
  });
  it('keeps the reference handle spacing while empty days sit on a flat baseline', () => {
    const { points, segments } = weeklyTrail([], '2026-10-06', 8000);
    expect(points.map(({ x, y }) => [x, y])).toEqual([[22, 64], [66, 64], [110, 64], [154, 64], [198, 64], [242, 64], [286, 64]]);
    expect(segments.map(({ control1, control2 }) => [control1.x, control2.x])).toEqual([[39, 49], [83, 92], [127, 138], [170, 184], [214, 228], [259, 271]]);
    expect(segments.every(({ control1, control2 }) => control1.y === 64 && control2.y === 64)).toBe(true);
  });
  it('raises day heights in proportion to real steps', () => {
    const low = weeklyTrail([{ dateKey: '2026-10-06', steps: 2000 }], '2026-10-06', 8000);
    const high = weeklyTrail([{ dateKey: '2026-10-06', steps: 6000 }], '2026-10-06', 8000);
    expect(high.path).not.toBe(low.path);
    expect(high.points[6]).toMatchObject({ saved: true, steps: 6000, x: 286, y: 28 });
    expect(low.points[6].y).toBe(52);
    expect(low.points[6].steps).toBe(2000);
  });
  it('uses the same seven dates and aligned columns as the labels', () => {
    const { points } = weeklyTrail([], '2026-10-06', 8000);
    expect(points[0].dateKey).toBe('2026-09-30');
    expect(points[6].dateKey).toBe('2026-10-06');
    expect(points.map((point) => point.x)).toEqual([22, 66, 110, 154, 198, 242, 286]);
  });
  it('keeps missing data distinct from an actual saved zero', () => {
    const { points, segments } = weeklyTrail([{ dateKey: '2026-10-06', steps: 0 }], '2026-10-06', 8000);
    expect(points[6]).toMatchObject({ saved: true, steps: 0, y: 64 });
    expect(points.slice(0, 6).every((point) => !point.saved)).toBe(true);
    expect(segments.every(({ control1, control2 }) => control1.y === 64 && control2.y === 64)).toBe(true);
  });
  it('moves the marker on the displayed Bézier rather than a straight line', () => {
    const trail = weeklyTrail([{ dateKey: '2026-09-30', steps: 2000 }, { dateKey: '2026-10-01', steps: 6000 }], '2026-10-06', 8000);
    const { start, end, control1, control2 } = trail.segments[0];
    const midY = (start.y + 3 * control1.y + 3 * control2.y + end.y) / 8;
    expect(trailPositionAtX(44, trail).y).toBeCloseTo(midY, 3);
    expect(trailPositionAtX(-100, trail)).toEqual({ x: 22, y: 52 });
    expect(trailPositionAtX(999, trail)).toEqual({ x: 286, y: 64 });
    expect(trailPositionAtX(NaN, trail)).toEqual({ x: 22, y: 52 });
  });
  it('does not invent hills for equal totals or missing days', () => {
    const records = ['2026-10-04', '2026-10-05', '2026-10-06'].map((dateKey) => ({ dateKey, steps: 4000 }));
    const { points, segments } = weeklyTrail(records, '2026-10-06', 8000);
    expect(points.slice(4).map((point) => point.y)).toEqual([40, 40, 40]);
    expect(points.slice(0, 4).every((point) => point.y === 64)).toBe(true);
    expect(segments.slice(4).every(({ control1, control2 }) => control1.y === 40 && control2.y === 40)).toBe(true);
  });
  it('bounds extreme totals and unavailable goals without NaN coordinates', () => {
    const { points, segments, path } = weeklyTrail([{ dateKey: '2026-10-05', steps: 1000000 }, { dateKey: '2026-10-06', steps: NaN }], '2026-10-06', NaN);
    expect(points[6].steps).toBe(0);
    expect(points.every((point) => point.y >= 16 && point.y <= 64)).toBe(true);
    expect(segments.every(({ control1, control2 }) => [control1.y, control2.y].every((y) => y >= 7 && y <= 64))).toBe(true);
    expect(path).not.toMatch(/NaN|Infinity/);
  });
});
