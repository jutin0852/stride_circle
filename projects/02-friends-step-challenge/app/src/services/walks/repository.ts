import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { saveActivity } from '@/lib/activities';
import { database, requireFirebase } from '@/lib/firebase';
import { averagePace, defaultRoutePrivacy, routeBounds, validCoordinate, validPlannedWalk, validWalk, type GpsSample, type PlannedWalk, type WalkActivity } from '@/domain/walk';
import type { RecordingSession } from '@/lib/activity-recording';
import { simplifyRoute } from '@/lib/route';

const listeners = new Set<() => void>();
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(run: () => Promise<T>) { const next = queue.catch(() => {}).then(run); queue = next; return next; }
const key = (userId: string, kind: string) => `stride:${kind}:v1:${userId}`;
async function read<T>(userId: string, kind: string): Promise<T[]> {
  const text = await AsyncStorage.getItem(key(userId, `${kind}:index`));
  if (!text) return [];
  const ids: unknown = JSON.parse(text);
  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) throw new Error('Invalid route index');
  const records = await Promise.all(ids.map(async id => {
    const record = await AsyncStorage.getItem(key(userId, `${kind}:${id}`));
    if (!record) throw new Error('Saved route data is missing');
    const value: unknown = JSON.parse(record);
    if (!validPlannedWalk(value) || value.ownerId !== userId) throw new Error('Invalid saved route data');
    return value;
  }));
  return records as T[];
}
async function write<T extends { id: string }>(userId: string, kind: string, records: T[]) {
  for (const record of records) {
    const recordKey = key(userId, `${kind}:${record.id}`);
    const json = JSON.stringify(record);
    if (await AsyncStorage.getItem(recordKey) !== json) await AsyncStorage.setItem(recordKey, json);
  }
  await AsyncStorage.setItem(key(userId, `${kind}:index`), JSON.stringify(records.map(r => r.id)));
  listeners.forEach(l => l());
}
export function subscribeWalks(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
async function walkIds(userId: string): Promise<string[]> {
  const text = await AsyncStorage.getItem(key(userId, 'walk-index'));
  if (!text) return [];
  const ids: unknown = JSON.parse(text);
  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) throw new Error('Invalid walk index');
  return ids;
}
async function localWalk(userId: string, id: string) {
  const text = await AsyncStorage.getItem(key(userId, `walk:${id}`));
  if (!text) return null;
  const value: unknown = JSON.parse(text);
  if (!validWalk(value) || value.userId !== userId || value.id !== id) throw new Error('Invalid saved walk');
  return value;
}
export async function listLocalWalks(userId: string) {
  const records = await Promise.all((await walkIds(userId)).map(id => localWalk(userId, id)));
  if (records.some(r => !r)) throw new Error('Walk recovery data is missing');
  return records as WalkActivity[];
}
/** Raw points are loaded on demand, never into every Home/History subscriber. */
export async function getLocalRawRoute(userId: string, id: string): Promise<GpsSample[]> {
  const activity = await localWalk(userId, id);
  if (!activity) return [];
  const result: GpsSample[] = [];
  for (let i = 0; i < (activity.rawSampleCount ?? 0); i += 500) {
    const text = await AsyncStorage.getItem(key(userId, `walk:${id}:raw:${i / 500}`));
    if (!text) throw new Error('Raw GPS recovery data is missing');
    const samples: GpsSample[] = JSON.parse(text);
    if (!Array.isArray(samples) || !samples.every(p => validCoordinate(p) && Number.isFinite(p.timestamp))) throw new Error('Invalid raw GPS data');
    result.push(...samples);
  }
  if (result.length < (activity.rawSampleCount ?? 0)) throw new Error('Raw GPS recovery data is incomplete');
  return result.slice(0, activity.rawSampleCount ?? 0);
}
const readPlans = (userId: string) => read<PlannedWalk>(userId, 'planned-walks');
export const listPlannedWalks = async (userId: string) => (await readPlans(userId)).filter(r => !r.deleted);
export async function getWalk(userId: string, id: string): Promise<WalkActivity | null> {
  const local = await localWalk(userId, id);
  if (local) return local;
  const snapshot = await getDoc(doc(requireFirebase(database, 'Firestore'), 'users', userId, 'walkDetails', id));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const activity = { ...data, rawCoordinates: [] };
  if (!validWalk(activity) || activity.userId !== userId || activity.id !== id) throw new Error('Invalid saved walk');
  return activity;
}
export function activityFromSession(session: RecordingSession): WalkActivity {
  if (session.status !== 'finished' || session.completedAt === null) throw new Error('Walk is still active');
  const startedAt = session.firstStartedAt ?? session.stepIntervals?.[0]?.start ?? session.completedAt - session.elapsedMs;
  return { version: 1, id: session.id, userId: session.userId, title: 'Your walk', notes: '',
    dateKey: session.completedDateKey!, startedAt, endedAt: session.completedAt,
    durationSeconds: session.elapsedMs / 1000, elapsedSeconds: Math.max(0, session.completedAt - startedAt) / 1000,
    movingDurationSeconds: session.movingDurationMs === undefined ? null : session.movingDurationMs / 1000,
    steps: session.steps ?? null, distanceMeters: session.distanceMeters, averagePaceSecondsPerKm: averagePace(session.elapsedMs / 1000, session.distanceMeters),
    rawCoordinates: session.rawCoordinates ?? [], displayCoordinates: simplifyRoute(session.route, 1500),
    privacy: { ...defaultRoutePrivacy }, startCoordinate: session.route[0] ?? null, endCoordinate: session.route.at(-1) ?? null,
    bounds: routeBounds(session.route), createdAt: session.completedAt, updatedAt: session.completedAt, syncStatus: 'pending' };
}
export function saveLocalWalk(activity: WalkActivity) {
  return exclusive(async () => {
    if (!validWalk(activity)) throw new Error('Invalid walk');
    const ids = await walkIds(activity.userId);
    const previous = await localWalk(activity.userId, activity.id);
    for (let i = 0; i < activity.rawCoordinates.length; i += 500) {
      await AsyncStorage.setItem(key(activity.userId, `walk:${activity.id}:raw:${i / 500}`), JSON.stringify(activity.rawCoordinates.slice(i, i + 500)));
    }
    const metadata = { ...activity, rawCoordinates: [], rawSampleCount: activity.rawCoordinates.length || activity.rawSampleCount || previous?.rawSampleCount || 0,
      rawUploaded: activity.rawUploaded ?? previous?.rawUploaded ?? false };
    await AsyncStorage.setItem(key(activity.userId, `walk:${activity.id}`), JSON.stringify(metadata));
    await AsyncStorage.setItem(key(activity.userId, 'walk-index'), JSON.stringify([activity.id, ...ids.filter(id => id !== activity.id)]));
    listeners.forEach(l => l());
  });
}
const syncing = new Map<string, Promise<void>>();
/** Chunk raw GPS under owner-only documents; never exceed Firestore's 1 MiB activity limit. */
export function syncPendingWalks(userId: string) {
  const existing = syncing.get(userId);
  if (existing) return existing;
  const run = (async () => {
    const records = await listLocalWalks(userId);
    for (const activity of records.filter(r => r.syncStatus === 'pending')) {
      const db = requireFirebase(database, 'Firestore');
      const raw = activity.rawUploaded ? [] : await getLocalRawRoute(userId, activity.id);
      for (let i = 0; i < raw.length; i += 500) {
        await setDoc(doc(db, 'users', userId, 'activities', activity.id, 'rawRoute', String(i / 500)), { samples: raw.slice(i, i + 500) });
      }
      const { rawCoordinates, ...metadata } = activity;
      await setDoc(doc(db, 'users', userId, 'walkDetails', activity.id), { ...metadata, rawSampleCount: activity.rawSampleCount ?? rawCoordinates.length, rawUploaded: true, syncStatus: 'synced' });
      await saveActivity({ activityId: activity.id, activityType: 'walk', userId, dateKey: activity.dateKey,
        durationMs: activity.durationSeconds * 1000, distanceMeters: activity.distanceMeters, route: activity.displayCoordinates, title: activity.title, steps: activity.steps });
      await exclusive(async () => {
        const latest = await localWalk(userId, activity.id);
        if (!latest) throw new Error('Walk recovery data is missing');
        await AsyncStorage.setItem(key(userId, `walk:${activity.id}`), JSON.stringify({ ...latest, rawUploaded: true,
          syncStatus: latest.updatedAt === activity.updatedAt ? 'synced' : latest.syncStatus }));
        listeners.forEach(l => l());
      });
    }
    for (const plan of (await readPlans(userId)).filter(r => r.syncStatus === 'pending')) {
      const reference = doc(requireFirebase(database, 'Firestore'), 'users', userId, 'plannedWalks', plan.id);
      if (plan.deleted) await deleteDoc(reference);
      else await setDoc(reference, { ...plan, syncStatus: 'synced' });
      await exclusive(async () => {
        const latest = await readPlans(userId);
        await write(userId, 'planned-walks', latest.flatMap(r => r.id !== plan.id || r.updatedAt !== plan.updatedAt ? [r] : plan.deleted ? [] : [{ ...r, syncStatus: 'synced' as const }]));
      });
    }
  })().finally(() => { syncing.delete(userId); });
  syncing.set(userId, run);
  return run;
}
export function savePlannedWalk(route: PlannedWalk) {
  return exclusive(async () => {
    if (!validPlannedWalk(route)) throw new Error('Invalid planned route');
    await write(route.ownerId, 'planned-walks', [{ ...route, updatedAt: Date.now(), syncStatus: 'pending', deleted: false }, ...(await readPlans(route.ownerId)).filter(r => r.id !== route.id)]);
  });
}
export function deletePlannedWalk(userId: string, id: string) {
  return exclusive(async () => write(userId, 'planned-walks', (await readPlans(userId)).map(r => r.id === id ? { ...r, deleted: true, syncStatus: 'pending', updatedAt: Date.now() } : r)));
}
export async function hydratePlannedWalks(userId: string) {
  const snapshots = await getDocs(collection(requireFirebase(database, 'Firestore'), 'users', userId, 'plannedWalks'));
  const remote = snapshots.docs.map(d => d.data()).filter(validPlannedWalk).filter(r => r.ownerId === userId);
  await exclusive(async () => {
    const local = await readPlans(userId);
    const pending = local.filter(r => r.syncStatus === 'pending');
    await write(userId, 'planned-walks', [...pending, ...remote.filter(r => !pending.some(p => p.id === r.id))]);
  });
}
