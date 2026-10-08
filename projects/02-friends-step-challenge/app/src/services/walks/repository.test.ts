import { beforeEach, expect, it, vi } from 'vitest';
import { activityFromSession, deletePlannedWalk, getLocalRawRoute, getWalk, listLocalWalks, listPlannedWalks, saveLocalWalk, savePlannedWalk, syncPendingWalks } from './repository';
import { finishRecording, newRecording, recordLocations } from '@/lib/activity-recording';
const mock = vi.hoisted(() => ({ storage: new Map<string, string>(), set: vi.fn(), save: vi.fn(), networkWrite: vi.fn(), remote: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: async (key: string) => mock.storage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mock.set(key, value); mock.storage.set(key, value); },
} }));
vi.mock('firebase/firestore', () => ({ doc: (_db: unknown, ...parts: string[]) => parts.join('/'), setDoc: (...args: unknown[]) => mock.networkWrite(...args), getDoc: () => mock.remote(), deleteDoc: (...args: unknown[]) => mock.networkWrite(...args) }));
vi.mock('@/lib/firebase', () => ({ database: {}, requireFirebase: (db: unknown) => db }));
vi.mock('@/lib/activities', () => ({ saveActivity: (...args: unknown[]) => mock.save(...args) }));
beforeEach(() => { mock.storage.clear(); mock.set.mockReset(); mock.save.mockReset(); mock.networkWrite.mockReset(); });
function activity(id = 'walk') {
  const session = recordLocations(newRecording(id, 'user', 'walk', 1000), [{ timestamp: 1000, coords: { latitude: 0, longitude: 0, accuracy: 5 } }]);
  return activityFromSession(finishRecording({ ...session, steps: 100 }, 11000));
}
it('saves complete activities offline and preserves raw samples', async () => {
  const walk = activity(); await saveLocalWalk(walk);
  expect(await getWalk('user', walk.id)).toEqual({ ...walk, rawCoordinates: [], rawSampleCount: 1, rawUploaded: false });
  expect(mock.networkWrite).not.toHaveBeenCalled();
  expect(await getLocalRawRoute('user', walk.id)).toEqual(walk.rawCoordinates);
  expect((await listLocalWalks('user'))[0].rawCoordinates).toHaveLength(0);
});
it('retains a pending completed activity after upload failure for later retry', async () => {
  await saveLocalWalk(activity()); mock.networkWrite.mockRejectedValueOnce(new Error('offline'));
  await expect(syncPendingWalks('user')).rejects.toThrow('offline');
  expect((await listLocalWalks('user'))[0].syncStatus).toBe('pending');
  await syncPendingWalks('user');
  expect((await listLocalWalks('user'))[0].syncStatus).toBe('synced');
  expect(mock.save.mock.calls[0][0].activityId).toBe('walk');
  expect(mock.networkWrite.mock.calls.some(call => call[0].endsWith('/rawRoute/0'))).toBe(true);
});
it('a pending network upload cannot block a second local save or erase an edit', async () => {
  const first = activity(); await saveLocalWalk(first);
  let release!: () => void;
  mock.networkWrite.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const syncing = syncPendingWalks('user');
  await vi.waitFor(() => expect(release).toBeDefined());
  await saveLocalWalk(activity('second'));
  await saveLocalWalk({ ...first, title: 'Edited while offline', updatedAt: first.updatedAt + 1 });
  release(); await syncing;
  const records = await listLocalWalks('user'); expect(records).toHaveLength(2);
  expect(records.find(r => r.id === 'walk')?.syncStatus).toBe('pending');
  expect(records.find(r => r.id === 'walk')?.title).toBe('Edited while offline');
});
it('saved routes are isolated per owner and can be deleted', async () => {
  const plan = { version: 1 as const, id: 'route', ownerId: 'user', name: 'Park', coordinates: [{ latitude: 0, longitude: 0 }], waypoints: [{ latitude: 0, longitude: 0 }], distanceMeters: 100, estimatedDurationSeconds: 80, createdAt: 1000 };
  await savePlannedWalk(plan); expect(await listPlannedWalks('other')).toEqual([]);
  expect(await listPlannedWalks('user')).toEqual([expect.objectContaining(plan)]); await deletePlannedWalk('user', 'route');
  expect(await listPlannedWalks('user')).toEqual([]);
});
it('corrupt cache is reported without overwriting stored data', async () => {
  mock.storage.set('stride:walk-index:v1:user', 'broken');
  await expect(saveLocalWalk(activity())).rejects.toThrow();
  expect(mock.storage.get('stride:walk-index:v1:user')).toBe('broken');
});
it('stores long raw traces in bounded chunks without loading them into History', async () => {
  const walk = activity();
  walk.rawCoordinates = Array.from({ length: 1201 }, (_, i) => ({ latitude: 0, longitude: i / 100000, timestamp: 1000 + i * 5000, accuracy: 5 }));
  await saveLocalWalk(walk);
  expect(await getLocalRawRoute('user', walk.id)).toEqual(walk.rawCoordinates);
  expect(JSON.parse(mock.storage.get('stride:walk:walk:raw:0:v1:user')!)).toHaveLength(500);
  expect(JSON.parse(mock.storage.get('stride:walk:walk:raw:2:v1:user')!)).toHaveLength(201);
  expect((await listLocalWalks('user'))[0].rawCoordinates).toEqual([]);
  mock.storage.set('stride:walk:walk:raw:2:v1:user', '[]');
  await expect(getLocalRawRoute('user', walk.id)).rejects.toThrow('incomplete');
});
