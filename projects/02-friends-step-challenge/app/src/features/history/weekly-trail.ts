import { sevenDayRhythm, type StepDay } from '@/domain/walking-history';

// Bézier handles from the approved OpenDesign export. Preserve its curved
// track character while anchoring every day's height to real measured steps.
const waypoints = [
  { x: 22, y: 53 }, { x: 66, y: 30 }, { x: 110, y: 61 },
  { x: 154, y: 29 }, { x: 198, y: 34 }, { x: 242, y: 24 }, { x: 286, y: 48 },
] as const;
const controls = [
  [39, 62, 49, 43], [83, 16, 92, 22], [127, 77, 138, 44],
  [170, 16, 184, 31], [214, 39, 228, 35], [259, 12, 271, 35],
] as const;
/** Missing measurements and saved zero both sit on the baseline, not a hill. */
export function weeklyTrail(records: StepDay[], today: string, goal: number) {
  const saved = new Set(records.map((record) => record.dateKey));
  const days = sevenDayRhythm(records, today).map((day, index) => ({
    ...day,
    steps: Number.isFinite(day.steps) ? Math.max(0, day.steps) : 0,
    saved: saved.has(day.dateKey),
    ...waypoints[index],
  }));
  const ceiling = Math.max(Number.isFinite(goal) && goal > 0 ? goal : 1, ...days.map((day) => day.steps));
  const points = days.map((day) => ({ ...day, y: 64 - (day.steps / ceiling) * 48 }));
  const segments = controls.map(([x1, y1, x2, y2], index) => {
    const start = points[index];
    const end = points[index + 1];
    const referenceStart = waypoints[index];
    const referenceEnd = waypoints[index + 1];
    const scale = Math.abs(end.y - start.y) / Math.abs(referenceEnd.y - referenceStart.y);
    const clamp = (y: number) => Math.max(7, Math.min(64, y));
    return {
      start, end,
      control1: { x: x1, y: clamp(start.y + (y1 - referenceStart.y) * scale) },
      control2: { x: x2, y: clamp(end.y + (y2 - referenceEnd.y) * scale) },
    };
  });
  const path = `M${points[0].x} ${points[0].y} ${segments.map(({ control1, control2, end }) =>
    `C${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`
  ).join(' ')}`;
  return { points, segments, path };
}

/** Seven equal-width touch columns, also used by the weekday labels. */
export function trailDayAtX(x: number, width: number) {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return 0;
  return Math.max(0, Math.min(6, Math.floor(x / width * 7)));
}

export function isHorizontalTrailGesture(dx: number, dy: number) {
  return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
}

/** Move the viewing marker along the displayed cubic, not a straight line. */
export function trailPositionAtX(viewBoxX: number, trail: ReturnType<typeof weeklyTrail>) {
  const x = Math.max(22, Math.min(286, Number.isFinite(viewBoxX) ? viewBoxX : 22));
  const waypoint = trail.points.find((point) => point.x === x);
  if (waypoint) return { x: waypoint.x, y: waypoint.y };
  const index = trail.points.findIndex((point) => point.x > x) - 1;
  const { start, end, control1, control2 } = trail.segments[index];
  const cubic = (a: number, b: number, c: number, d: number, t: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  // All six curves are monotonic in x; this bounded search is subpixel-accurate.
  let low = 0;
  let high = 1;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const t = (low + high) / 2;
    if (cubic(start.x, control1.x, control2.x, end.x, t) < x) low = t;
    else high = t;
  }
  return { x, y: cubic(start.y, control1.y, control2.y, end.y, (low + high) / 2) };
}
