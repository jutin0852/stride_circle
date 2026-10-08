export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getDateKeyDaysBefore(date: Date, timeZone: string, daysBefore: number) {
  const [year, month, day] = getDateKeyInTimeZone(date, timeZone).split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day - daysBefore, 12));
  return [shifted.getUTCFullYear(), String(shifted.getUTCMonth() + 1).padStart(2, '0'), String(shifted.getUTCDate()).padStart(2, '0')].join('-');
}

export function getWeekStartKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const daysFromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function getWeekDateKeys(dateKey: string) {
  const weekStartKey = getWeekStartKey(dateKey);
  const [year, month, day] = weekStartKey.split('-').map(Number);
  const weekStart = new Date(Date.UTC(year, month - 1, day, 12));
  return Array.from({ length: 7 }, (_, index) => getDateKeyDaysBefore(weekStart, 'UTC', -index));
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}
