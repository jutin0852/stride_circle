import { sevenDayRhythm, type StepDay } from '@/domain/walking-history';

/** Same seven-day window as History; only saved days contribute to the trail. */
export function weeklyTrail(records: StepDay[], today: string, goal: number) {
  const saved = new Set(records.map((record) => record.dateKey));
  const days = sevenDayRhythm(records, today).map((day, index) => ({
    ...day,
    steps: Number.isFinite(day.steps) ? Math.max(0, day.steps) : 0,
    saved: saved.has(day.dateKey),
    x: 22 + index * 44,
  }));
  const ceiling = Math.max(Number.isFinite(goal) && goal > 0 ? goal : 1, ...days.map((day) => day.steps));
  const points = days.map((day) => ({ ...day, y: 64 - (day.steps / ceiling) * 48 }));
  let path = '';
  points.forEach((point, index) => {
    if (!point.saved) return;
    const previous = points[index - 1];
    if (!previous?.saved) {
      path += `M ${point.x} ${point.y} `;
    } else {
      // Horizontal endpoint tangents keep each segment within its real values.
      const middle = (previous.x + point.x) / 2;
      path += `C ${middle} ${previous.y} ${middle} ${point.y} ${point.x} ${point.y} `;
    }
  });
  return { points, path: path.trim() };
}
