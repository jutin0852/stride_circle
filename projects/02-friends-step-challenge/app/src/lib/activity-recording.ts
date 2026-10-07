import type { RoutePoint } from '@/lib/route';

export type RecordingSample = { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null } };
export type RecordingSession = {
  version: 1;
  id: string;
  userId: string;
  activityType: 'walk' | 'run';
  status: 'tracking' | 'paused' | 'finished';
  segment: number;
  startedAt: number | null;
  elapsedMs: number;
  lastTimestamp: number;
  completedAt: number | null;
  completedDateKey: string | null;
  distanceMeters: number;
  route: RoutePoint[];
  previous: { point: RoutePoint; timestamp: number } | null;
  currentLocation: RoutePoint | null;
  accuracyMeters: number | null;
  gpsSignal: 'acquiring' | 'ready' | 'weak';
  currentPaceSecondsPerKm: number | null;
  pauseReason: 'manual' | 'gps-error' | 'recovered' | null;
};

export const GPS_STALE_MS = 15_000;

export function recordingElapsed(session: RecordingSession, now: number) {
  return session.elapsedMs + (session.startedAt === null ? 0 : Math.max(0, now - session.startedAt));
}

export function newRecording(id: string, userId: string, activityType: 'walk' | 'run', now: number): RecordingSession {
  return { version: 1, id, userId, activityType, status: 'tracking', segment: 1, startedAt: now,
    elapsedMs: 0, lastTimestamp: 0, completedAt: null, completedDateKey: null, distanceMeters: 0, route: [], previous: null,
    currentLocation: null, accuracyMeters: null, gpsSignal: 'acquiring', currentPaceSecondsPerKm: null, pauseReason: null };
}

export function pauseRecording(session: RecordingSession, now: number, reason: RecordingSession['pauseReason']): RecordingSession {
  return { ...session, status: 'paused', elapsedMs: recordingElapsed(session, now), startedAt: null,
    previous: null, currentPaceSecondsPerKm: null, pauseReason: reason };
}

export function resumeRecording(session: RecordingSession, now: number): RecordingSession {
  return { ...session, status: 'tracking', segment: session.segment + 1, startedAt: now, previous: null,
    gpsSignal: 'acquiring', currentPaceSecondsPerKm: null, pauseReason: null, completedAt: null, completedDateKey: null };
}

export function finishRecording(session: RecordingSession, now: number): RecordingSession {
  const date = new Date(session.completedAt ?? now);
  const completedDateKey = session.completedDateKey ?? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { ...pauseRecording(session, now, null), status: 'finished', completedAt: session.completedAt ?? now, completedDateKey };
}

function metersBetween(a: RoutePoint, b: RoutePoint) {
  const radians = Math.PI / 180;
  const term = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2
    + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(Math.max(0, 1 - term)));
}

/** Use sample timestamps, not callback arrival times: native updates can arrive in batches. */
export function recordLocations(session: RecordingSession, samples: RecordingSample[]): RecordingSession {
  if (session.status !== 'tracking' || session.startedAt === null) return session;
  let next = session;
  for (const sample of [...samples].sort((a, b) => a.timestamp - b.timestamp)) {
    const { latitude, longitude, accuracy } = sample.coords;
    if (!Number.isFinite(sample.timestamp) || sample.timestamp < session.startedAt || sample.timestamp <= next.lastTimestamp
      || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) continue;
    next = { ...next, lastTimestamp: sample.timestamp, accuracyMeters: accuracy };
    if (accuracy === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 35) {
      next = { ...next, previous: null, gpsSignal: 'weak', currentPaceSecondsPerKm: null };
      continue;
    }
    const point = { latitude, longitude };
    const previous = next.previous;
    next = { ...next, currentLocation: point, gpsSignal: 'ready' };
    if (!previous || sample.timestamp - previous.timestamp > GPS_STALE_MS) {
      next = { ...next, previous: { point, timestamp: sample.timestamp }, route: [...next.route, { ...point, segmentStart: true }], currentPaceSecondsPerKm: null };
      continue;
    }
    const distance = metersBetween(previous.point, point);
    const seconds = (sample.timestamp - previous.timestamp) / 1000;
    if (distance / seconds > 8) {
      next = { ...next, previous: null, gpsSignal: 'weak', currentPaceSecondsPerKm: null };
    } else if (distance >= 2) {
      next = { ...next, previous: { point, timestamp: sample.timestamp }, distanceMeters: next.distanceMeters + distance,
        route: [...next.route, point], currentPaceSecondsPerKm: seconds / distance * 1000 };
    }
  }
  return next;
}

/** Reject corrupt snapshots rather than restoring invented time or invalid coordinates. */
export function readRecording(value: string | null): RecordingSession | null {
  if (!value) return null;
  try {
    const item = JSON.parse(value) as RecordingSession;
    if (item.version !== 1 || typeof item.id !== 'string' || typeof item.userId !== 'string'
      || !['walk', 'run'].includes(item.activityType) || !['tracking', 'paused', 'finished'].includes(item.status)
      || !Number.isFinite(item.elapsedMs) || item.elapsedMs < 0 || !Number.isFinite(item.distanceMeters) || item.distanceMeters < 0
      || !Number.isFinite(item.segment) || !Number.isFinite(item.lastTimestamp)
      || (item.startedAt !== null && !Number.isFinite(item.startedAt))
      || (item.completedAt !== null && !Number.isFinite(item.completedAt))
      || (item.completedDateKey !== null && (typeof item.completedDateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.completedDateKey)))
      || !Array.isArray(item.route) || item.route.some((point) => !Number.isFinite(point.latitude) || Math.abs(point.latitude) > 90
        || !Number.isFinite(point.longitude) || Math.abs(point.longitude) > 180)) return null;
    // An interruption always begins a fresh segment, even if an old previous point was persisted.
    return { ...item, previous: null, currentPaceSecondsPerKm: null };
  } catch { return null; }
}
