import { splitRoute, type RoutePoint } from '@/lib/route';

export type GpsSample = RoutePoint & { timestamp: number; accuracy: number | null; altitude?: number | null; speed?: number | null };
export type RoutePrivacy = { hideMap: boolean; hideStartEnd: boolean; radiusMeters: number };
export const defaultRoutePrivacy: RoutePrivacy = { hideMap: false, hideStartEnd: true, radiusMeters: 200 };
export type WalkActivity = {
  version: 1; id: string; userId: string; title: string; notes: string; dateKey: string;
  startedAt: number; endedAt: number; durationSeconds: number; elapsedSeconds: number;
  movingDurationSeconds: number | null; distanceMeters: number; steps: number | null;
  averagePaceSecondsPerKm: number | null; rawCoordinates: GpsSample[];
  displayCoordinates: RoutePoint[]; privacy: RoutePrivacy;
  startCoordinate: RoutePoint | null; endCoordinate: RoutePoint | null;
  bounds: ReturnType<typeof routeBounds>; createdAt: number; updatedAt: number;
  syncStatus: 'pending' | 'synced';
  rawSampleCount?: number;
  rawUploaded?: boolean;
};
export type PlannedWalk = { version: 1; id: string; ownerId: string; name: string; coordinates: RoutePoint[];
  waypoints: RoutePoint[]; distanceMeters: number; estimatedDurationSeconds: number; createdAt: number;
  updatedAt?: number; syncStatus?: 'pending' | 'synced'; deleted?: boolean };
export const ESTIMATED_METERS_PER_STEP = 0.75;
export const estimatedSteps = (meters: number) => Math.round(Math.max(0, meters) / ESTIMATED_METERS_PER_STEP);
export function validCoordinate(point: RoutePoint) {
  return Boolean(point) && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function validWalk(value: unknown): value is WalkActivity {
  const a = value as WalkActivity | null;
  return Boolean(a && a.version === 1 && typeof a.id === 'string' && typeof a.userId === 'string' && typeof a.title === 'string' && typeof a.notes === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(a.dateKey) && nonnegative(a.startedAt) && nonnegative(a.endedAt) && a.endedAt >= a.startedAt
    && nonnegative(a.durationSeconds) && nonnegative(a.elapsedSeconds) && nonnegative(a.distanceMeters)
    && (a.steps === null || nonnegative(a.steps)) && (a.movingDurationSeconds === null || nonnegative(a.movingDurationSeconds))
    && (a.averagePaceSecondsPerKm === null || nonnegative(a.averagePaceSecondsPerKm))
    && Array.isArray(a.displayCoordinates) && a.displayCoordinates.every(validCoordinate)
    && Array.isArray(a.rawCoordinates) && a.rawCoordinates.every(p => validCoordinate(p) && Number.isFinite(p.timestamp))
    && (a.rawSampleCount === undefined || (Number.isSafeInteger(a.rawSampleCount) && a.rawSampleCount >= 0))
    && (a.rawUploaded === undefined || typeof a.rawUploaded === 'boolean')
    && a.privacy && typeof a.privacy.hideMap === 'boolean' && typeof a.privacy.hideStartEnd === 'boolean' && nonnegative(a.privacy.radiusMeters)
    && nonnegative(a.createdAt) && nonnegative(a.updatedAt) && ['pending', 'synced'].includes(a.syncStatus));
}
export function validPlannedWalk(value: unknown): value is PlannedWalk {
  const r = value as PlannedWalk | null;
  return Boolean(r && r.version === 1 && typeof r.id === 'string' && typeof r.ownerId === 'string' && typeof r.name === 'string'
    && Array.isArray(r.coordinates) && r.coordinates.every(validCoordinate) && Array.isArray(r.waypoints) && r.waypoints.every(validCoordinate)
    && nonnegative(r.distanceMeters) && nonnegative(r.estimatedDurationSeconds) && nonnegative(r.createdAt));
}
export function distanceBetween(a: RoutePoint, b: RoutePoint) {
  const r = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * r / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin((b.longitude - a.longitude) * r / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function routeDistance(route: RoutePoint[]) {
  return route.reduce((total, point, i) => total + (i && !point.segmentStart ? distanceBetween(route[i - 1], point) : 0), 0);
}
export function averagePace(seconds: number, meters: number) {
  return meters >= 20 && Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 / meters : null;
}
export function formatWalkPace(pace: number | null) {
  if (pace === null || !Number.isFinite(pace) || pace <= 0) return '—';
  const rounded = Math.round(pace);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')} /km`;
}
export function formatWalkTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function routeBounds(route: RoutePoint[]) {
  const points = route.filter(validCoordinate);
  if (!points.length) return null;
  return { north: Math.max(...points.map(p => p.latitude)), south: Math.min(...points.map(p => p.latitude)),
    east: Math.max(...points.map(p => p.longitude)), west: Math.min(...points.map(p => p.longitude)) };
}

/** Exclude radial zones as well as travelled distance: a loop can pass home again. */
export function privacyRoute(route: RoutePoint[], privacy: RoutePrivacy): RoutePoint[] {
  if (privacy.hideMap || !route.length) return [];
  if (!privacy.hideStartEnd) return route.map(p => ({ ...p }));
  const radius = Number.isFinite(privacy.radiusMeters) ? Math.max(0, privacy.radiusMeters) : 200;
  const fromStart = [0];
  for (let i = 1; i < route.length; i++) fromStart[i] = fromStart[i - 1] + (route[i].segmentStart ? 0 : distanceBetween(route[i - 1], route[i]));
  const total = fromStart.at(-1)!;
  let gap = true;
  return route.flatMap((p, i) => {
    if (fromStart[i] < radius || total - fromStart[i] < radius || distanceBetween(p, route[0]) < radius || distanceBetween(p, route.at(-1)!) < radius) { gap = true; return []; }
    const point = { latitude: p.latitude, longitude: p.longitude, ...(gap || p.segmentStart ? { segmentStart: true } : {}) };
    gap = false; return [point];
  });
}

/** A deliberately allowlisted social payload never contains owner endpoints or raw fixes. */
export function shareableWalk(activity: WalkActivity) {
  return { id: activity.id, title: activity.title, dateKey: activity.dateKey, steps: activity.steps,
    distanceMeters: activity.distanceMeters, durationSeconds: activity.durationSeconds,
    averagePaceSecondsPerKm: activity.averagePaceSecondsPerKm,
    route: privacyRoute(activity.displayCoordinates, activity.privacy) };
}
export function routeGeoJSON(route: RoutePoint[]) {
  return { type: 'FeatureCollection' as const, features: splitRoute(route).filter(s => s.length > 1).map(segment => ({ type: 'Feature' as const,
    properties: {}, geometry: { type: 'LineString' as const, coordinates: segment.map(p => [p.longitude, p.latitude]) } })) };
}
