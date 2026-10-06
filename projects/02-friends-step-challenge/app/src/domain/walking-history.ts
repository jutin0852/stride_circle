export type StepDay = { dateKey: string; steps: number };

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function isValidDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && localDateKey(dateFromKey(key)) === key;
}

export function shiftDateKey(key: string, days: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function shiftMonth(key: string, offset: number) {
  const date = dateFromKey(key);
  return localDateKey(new Date(date.getFullYear(), date.getMonth() + offset, 1, 12));
}

export function monthRange(key: string) {
  const date = dateFromKey(key);
  return {
    from: localDateKey(new Date(date.getFullYear(), date.getMonth(), 1, 12)),
    to: localDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12)),
  };
}

/** Monday-first rows. Noon/local calendar arithmetic avoids DST duration errors. */
export function monthCells(key: string): (string | null)[] {
  const { from, to } = monthRange(key);
  const leading = (dateFromKey(from).getDay() + 6) % 7;
  const count = dateFromKey(to).getDate();
  return Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
    const day = index - leading;
    return day >= 0 && day < count ? shiftDateKey(from, day) : null;
  });
}

/** Sunday-first rows for the History calendar presentation. */
export function monthCellsSundayFirst(key: string): (string | null)[] {
  const { from, to } = monthRange(key);
  const leading = dateFromKey(from).getDay();
  const count = dateFromKey(to).getDate();
  return Array.from({ length: Math.ceil((leading + count) / 7) * 7 }, (_, index) => {
    const day = index - leading;
    return day >= 0 && day < count ? shiftDateKey(from, day) : null;
  });
}

export function sevenDayRecap(records: StepDay[], today: string) {
  const from = shiftDateKey(today, -6);
  const days = records.filter((day) => day.dateKey >= from && day.dateKey <= today);
  return {
    totalSteps: days.reduce((total, day) => total + day.steps, 0),
    activeDays: days.filter((day) => day.steps > 0).length,
    savedDays: days.length,
    bestDaySteps: Math.max(0, ...days.map((day) => day.steps)),
  };
}

export function sevenDayRhythm(records: StepDay[], today: string) {
  const byDate = new Map(records.map((day) => [day.dateKey, day.steps]));
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = shiftDateKey(today, index - 6);
    return { dateKey, steps: byDate.get(dateKey) ?? 0 };
  });
}

export const WALKING_MILESTONES = [
  { days: 7, title: 'A week of walks', description: 'Make movement part of your everyday.', icon: 'footsteps' },
  { days: 30, title: 'Finding your stride', description: 'One month. A habit worth celebrating.', icon: 'flame' },
  { days: 100, title: 'A hundred little wins', description: 'Small steps, a remarkable journey.', icon: 'ribbon' },
  { days: 365, title: 'Your walking year', description: 'A whole year of showing up for yourself.', icon: 'trophy' },
] as const;

export function nextWalkingMilestone(streak: number) {
  return WALKING_MILESTONES.find((milestone) => milestone.days > streak) ?? null;
}
