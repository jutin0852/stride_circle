import type { RoutePoint } from '@/lib/route';
import { distanceBetween, validCoordinate, type GpsSample } from '@/domain/walk';

export type RecordingSample = { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null; altitude?: number | null; speed?: number | null } };
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
  firstStartedAt?: number;
  rawCoordinates?: GpsSample[];
  stepIntervals?: { start: number; end: number | null }[];
  steps?: number | null;
  movingDurationMs?: number;
  locationMode?: 'foreground' | 'background';
  plannedRouteId?: string;
  rawSamplesStored?: number;
};

export const GPS_STALE_MS = 15_000;

export function recordingElapsed(session: RecordingSession, now: number) {
  return session.elapsedMs + (session.startedAt === null ? 0 : Math.max(0, now - session.startedAt));
}

export function newRecording(id: string, userId: string, activityType: 'walk' | 'run', now: number): RecordingSession {
  return { version: 1, id, userId, activityType, status: 'tracking', segment: 1, startedAt: now,
    elapsedMs: 0, lastTimestamp: 0, completedAt: null, completedDateKey: null, distanceMeters: 0, route: [], previous: null,
    currentLocation: null, accuracyMeters: null, gpsSignal: 'acquiring', currentPaceSecondsPerKm: null, pauseReason: null,
    firstStartedAt: now, rawCoordinates: [], stepIntervals: [{ start: now, end: null }], steps: null, movingDurationMs: 0 };
}

export function pauseRecording(session: RecordingSession, now: number, reason: RecordingSession['pauseReason']): RecordingSession {
  return { ...session, status: 'paused', elapsedMs: recordingElapsed(session, now), startedAt: null,
    previous: null, currentPaceSecondsPerKm: null, pauseReason: reason,
    stepIntervals: session.stepIntervals?.map(interval => interval.end === null ? { ...interval, end: now } : interval) };
}

export function resumeRecording(session: RecordingSession, now: number): RecordingSession {
  return { ...session, status: 'tracking', segment: session.segment + 1, startedAt: now, previous: null,
    gpsSignal: 'acquiring', currentPaceSecondsPerKm: null, pauseReason: null, completedAt: null, completedDateKey: null,
    stepIntervals: [...(session.stepIntervals ?? []), { start: now, end: null }] };
}

export function finishRecording(session: RecordingSession, now: number): RecordingSession {
  const date = new Date(session.completedAt ?? now);
  const completedDateKey = session.completedDateKey ?? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { ...pauseRecording(session, now, null), status: 'finished', completedAt: session.completedAt ?? now, completedDateKey };
}

/** Use sample timestamps, not callback arrival times: native updates can arrive in batches. */
export function recordLocations(session: RecordingSession, samples: RecordingSample[]): RecordingSession {
  if (session.status !== 'tracking' || session.startedAt === null) return session;
  let next = session;
  for (const sample of [...samples].sort((a, b) => a.timestamp - b.timestamp)) {
    const { latitude, longitude, accuracy } = sample.coords;
    if (!Number.isFinite(sample.timestamp) || sample.timestamp < session.startedAt || sample.timestamp <= next.lastTimestamp
      || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) continue;
    next = { ...next, lastTimestamp: sample.timestamp, accuracyMeters: accuracy,
      rawCoordinates: [...(next.rawCoordinates ?? []), { latitude, longitude, timestamp: sample.timestamp, accuracy,
        altitude: sample.coords.altitude ?? null, speed: sample.coords.speed ?? null }] };
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
    const distance = distanceBetween(previous.point, point);
    const seconds = (sample.timestamp - previous.timestamp) / 1000;
    if (distance / seconds > 8) {
      next = { ...next, currentLocation: previous.point, previous: null, gpsSignal: 'weak', currentPaceSecondsPerKm: null };
    } else if (distance >= 2) {
      next = { ...next, previous: { point, timestamp: sample.timestamp }, distanceMeters: next.distanceMeters + distance,
        movingDurationMs: (next.movingDurationMs ?? 0) + (distance / seconds >= 0.3 ? seconds * 1000 : 0),
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
    if ((item.firstStartedAt !== undefined && !Number.isFinite(item.firstStartedAt))
      || (item.rawSamplesStored !== undefined && (!Number.isSafeInteger(item.rawSamplesStored) || item.rawSamplesStored < 0))
      || (item.steps !== undefined && item.steps !== null && (!Number.isFinite(item.steps) || item.steps < 0))
      || (item.movingDurationMs !== undefined && (!Number.isFinite(item.movingDurationMs) || item.movingDurationMs < 0))
      || (item.locationMode !== undefined && !['foreground', 'background'].includes(item.locationMode))
      || (item.currentLocation !== null && !validCoordinate(item.currentLocation))
      || (item.rawCoordinates !== undefined && (!Array.isArray(item.rawCoordinates) || item.rawCoordinates.some(p => !validCoordinate(p) || !Number.isFinite(p.timestamp))))
      || (item.stepIntervals !== undefined && (!Array.isArray(item.stepIntervals) || item.stepIntervals.some(i => !Number.isFinite(i.start)
        || (i.end !== null && (!Number.isFinite(i.end) || i.end < i.start)))))) return null;
    // An interruption always begins a fresh segment, even if an old previous point was persisted.
    return { ...item, previous: null, currentPaceSecondsPerKm: null };
  } catch { return null; }
}
