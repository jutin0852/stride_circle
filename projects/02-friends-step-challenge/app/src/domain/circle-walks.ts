export const MAX_CIRCLE_WALK_TITLE_LENGTH = 60;
export const MAX_CIRCLE_WALK_DETAILS_LENGTH = 240;
export const MAX_CIRCLE_WALK_MEETUP_LENGTH = 100;

export function localDateKeyAfter(daysAhead: number, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysAhead, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseCircleWalkDateTime(dateKey: string, time: string, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const startsAt = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (startsAt.getFullYear() !== year || startsAt.getMonth() !== month - 1 || startsAt.getDate() !== day || startsAt.getHours() !== hour || startsAt.getMinutes() !== minute) return null;
  return startsAt.getTime() > now + 5 * 60_000 ? startsAt : null;
}

export function formatCircleWalkTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone, timeZoneName: 'short' }).format(date);
}
