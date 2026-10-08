const test = require('node:test');
const { loadTS, harness, assert } = require('./hook-harness.cjs');

const core = loadTS('src/lib/activity-recording.ts', { '@/domain/walk': loadTS('src/domain/walk.ts', { '@/lib/route': loadTS('src/lib/route.ts') }) });
const sample = (latitude, timestamp, accuracy = 5) => ({ timestamp, coords: { latitude, longitude: 3.3792, accuracy } });

function recorder(options = {}) {
  let now = 100000;
  let task;
  let running = options.running ?? false;
  let starts = 0;
  let stops = 0;
  let storageFailure = false;
  let readFailure = false;
  let stopFailure = false;
  let backgroundAccess = true;
  let foregroundAccess = true;
  let available = true;
  let services = true;
  let nativeStart;
  let foregroundCallback;
  let appStateCallback;
  const storage = options.storage ?? new Map();
  const order = [];
  class Clock extends Date { static now() { return now; } }
  const location = {
    Accuracy: { High: 4 }, ActivityType: { Fitness: 3 },
    watchPositionAsync: async (_config, cb) => { foregroundCallback = cb; return { remove() { foregroundCallback = null; } }; },
    isBackgroundLocationAvailableAsync: async () => available,
    hasServicesEnabledAsync: async () => services,
    getForegroundPermissionsAsync: async () => ({ granted: foregroundAccess }),
    requestForegroundPermissionsAsync: async () => ({ granted: foregroundAccess }),
    getBackgroundPermissionsAsync: async () => ({ granted: backgroundAccess }),
    requestBackgroundPermissionsAsync: async () => { order.push('background-request'); return { granted: backgroundAccess }; },
    hasStartedLocationUpdatesAsync: async () => running,
    startLocationUpdatesAsync: async (_name, config) => {
      starts++; running = true;
      assert.equal(config.pausesUpdatesAutomatically, false);
      assert.equal(config.foregroundService.killServiceOnDestroy, true);
      if (nativeStart) await nativeStart();
    },
    stopLocationUpdatesAsync: async () => { if (stopFailure) throw new Error('stop failed'); stops++; running = false; },
  };
  const api = loadTS('src/lib/background-activity.ts', {
    'react-native': { AppState: { addEventListener: (_name, callback) => { appStateCallback = callback; return { remove() {} }; } } },
    '@/lib/activity-recording': core,
    '@react-native-async-storage/async-storage': {
      getItem: async (key) => { if (readFailure) throw new Error('read failed'); return storage.get(key) ?? null; },
      setItem: async (key, value) => { if (storageFailure) throw new Error('storage failed'); storage.set(key, value); },
      removeItem: async (key) => { if (storageFailure) throw new Error('storage failed'); storage.delete(key); },
    },
    'expo-crypto': { randomUUID: () => 'walk-' + starts },
    'expo-location': location,
    'expo-task-manager': {
      isAvailableAsync: async () => available,
      isTaskDefined: () => false,
      defineTask(name, callback) { assert.equal(name, 'stride-circle-active-walk-v1'); task = callback; },
    },
  }, { Date: Clock, process: { env: { EXPO_OS: options.platform ?? 'android' } } });
  const input = { userId: 'walker', activityType: 'walk', resuming: false,
    confirmBackgroundAccess: async () => { order.push('explanation'); return true; } };
  return { api, core, input, storage, order, location,
    foregroundSample(location) { foregroundCallback?.(location); }, background() { appStateCallback?.('background'); },
    advance(ms) { now += ms; }, setTime(value) { now = value; },
    get now() { return now; }, get starts() { return starts; }, get stops() { return stops; }, get running() { return running; },
    set nativeStart(fn) { nativeStart = fn; }, set storageFailure(value) { storageFailure = value; },
    set stopFailure(value) { stopFailure = value; }, set backgroundAccess(value) { backgroundAccess = value; },
    set readFailure(value) { readFailure = value; },
    set foregroundAccess(value) { foregroundAccess = value; }, set available(value) { available = value; }, set services(value) { services = value; },
    emit(locations) { return task({ data: { locations }, error: null }); },
    fail() { return task({ data: null, error: { message: 'GPS failed' } }); },
  };
}

test('batched locations are ordered and duplicate delivery cannot double distance', () => {
  const session = core.newRecording('id', 'walker', 'walk', 100000);
  const result = core.recordLocations(session, [sample(6.5245, 110000), sample(6.5244, 105000)]);
  assert.equal(result.route.length, 2);
  assert.ok(result.distanceMeters > 10);
  assert.equal(core.recordLocations(result, [sample(6.5244, 105000), sample(6.5245, 110000)]).distanceMeters, result.distanceMeters);
});

test('native route engine retains segments across pauses, weak accuracy, and long gaps', () => {
  let session = core.recordLocations(core.newRecording('id', 'walker', 'walk', 100000), [sample(6.5244, 105000), sample(6.5245, 110000)]);
  const distance = session.distanceMeters;
  session = core.resumeRecording(core.pauseRecording(session, 111000, 'manual'), 200000);
  session = core.recordLocations(session, [sample(6.526, 205000), sample(6.527, 210000, 100), sample(6.528, 215000), sample(6.53, 300000)]);
  assert.equal(session.route.length, 5);
  assert.equal(session.distanceMeters, distance);
  assert.ok(session.route.slice(2).every((point) => point.segmentStart));
});

test('bad coordinates and pre-resume samples are rejected', () => {
  const initial = core.newRecording('id', 'walker', 'walk', 100000);
  const result = core.recordLocations(initial, [sample(6.52, 99000), sample(99, 105000), sample(NaN, 110000)]);
  assert.equal(result.route.length, 0);
});

test('paused and finished duration stays fixed without changing the activity ID', () => {
  const paused = core.pauseRecording(core.newRecording('id', 'walker', 'run', 100000), 130000, 'manual');
  assert.equal(core.recordingElapsed(paused, 900000), 30000);
  const finished = core.finishRecording(paused, 900000);
  assert.equal(finished.id, 'id'); assert.equal(finished.activityType, 'run');
  assert.equal(core.recordingElapsed(finished, 950000), 30000);
});

test('corrupt local recovery records are rejected', () => {
  assert.equal(core.readRecording('{broken'), null);
  assert.equal(core.readRecording(JSON.stringify({ version: 1 })), null);
  const session = core.newRecording('id', 'walker', 'walk', 100000);
  assert.equal(core.readRecording(JSON.stringify({ ...session, distanceMeters: -1 })), null);
  assert.equal(core.readRecording(JSON.stringify(session)).id, 'id');
});

test('task is defined at import and stores locked-screen updates without a screen listener', async () => {
  const r = recorder();
  await r.api.beginBackgroundRecording(r.input);
  await r.emit([sample(6.5244, 105000), sample(6.5245, 110000)]);
  r.advance(60000);
  const saved = JSON.parse(r.storage.get(r.api.ACTIVITY_STORAGE_KEY));
  assert.equal(saved.route.length, 2);
  const finished = await r.api.finishBackgroundRecording();
  assert.equal(finished.elapsedMs, 60000);
  assert.ok(finished.distanceMeters > 10);
  assert.equal(r.running, false);
});

test('repeated Start calls create one native service and preserve an active recording', async () => {
  const r = recorder();
  await Promise.all([r.api.beginBackgroundRecording(r.input), r.api.beginBackgroundRecording(r.input)]);
  await r.emit([sample(6.5244, 105000)]);
  await r.api.beginBackgroundRecording(r.input);
  assert.equal(r.starts, 1);
  assert.equal(r.api.getBackgroundRecording().session.status, 'tracking');
  assert.equal(r.api.getBackgroundRecording().session.route.length, 1);
});

test('raw GPS chunks restore after headless relaunch and migrate legacy snapshots', async () => {
  const r = recorder();
  await r.api.beginBackgroundRecording(r.input);
  await r.emit(Array.from({ length: 1001 }, (_, i) => sample(6.5244 + i / 100000, 105000 + i * 5000)));
  const saved = JSON.parse(r.storage.get(r.api.ACTIVITY_STORAGE_KEY));
  assert.equal(saved.rawCoordinates, undefined);
  assert.equal(saved.rawSamplesStored, 1001);
  const relaunched = recorder({ storage: r.storage, running: true });
  await relaunched.api.restoreBackgroundRecording('walker');
  assert.equal(relaunched.api.getBackgroundRecording().session.rawCoordinates.length, 1001);
  const legacyStorage = new Map([[r.api.ACTIVITY_STORAGE_KEY, JSON.stringify({ ...saved, rawSamplesStored: undefined, rawCoordinates: r.api.getBackgroundRecording().session.rawCoordinates })]]);
  const legacy = recorder({ storage: legacyStorage, running: true });
  await legacy.api.restoreBackgroundRecording('walker');
  await legacy.api.pauseBackgroundRecording('walker');
  const migrated = recorder({ storage: legacyStorage });
  await migrated.api.restoreBackgroundRecording('walker');
  assert.equal(migrated.api.getBackgroundRecording().session.rawCoordinates.length, 1001);
});

test('background permission explanation precedes the system request; denial does not start', async () => {
  const r = recorder(); r.backgroundAccess = false;
  await r.api.beginBackgroundRecording(r.input);
  assert.deepEqual(r.order, ['explanation', 'background-request']);
  assert.equal(r.starts, 0);
  assert.equal(r.api.getBackgroundRecording().issue, 'permission');
});

test('canceling background access and denied foreground access do not start a service', async () => {
  const r = recorder(); r.backgroundAccess = false;
  await r.api.beginBackgroundRecording({ ...r.input, confirmBackgroundAccess: async () => false });
  assert.equal(r.starts, 0); assert.deepEqual(r.order, []);
  r.foregroundAccess = false;
  await r.api.beginBackgroundRecording(r.input);
  assert.equal(r.starts, 0); assert.equal(r.api.getBackgroundRecording().issue, 'permission');
});

test('unavailable background runtime is explicit and does not silently fall back', async () => {
  const r = recorder(); r.available = false;
  await r.api.beginBackgroundRecording(r.input);
  assert.equal(r.starts, 0);
  assert.equal(r.api.getBackgroundRecording().issue, 'unavailable');
});

test('failed native resume keeps earlier route and remains finishable', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.emit([sample(6.5244, 105000), sample(6.5245, 110000)]);
  await r.api.pauseBackgroundRecording();
  r.nativeStart = async () => { throw new Error('native failure'); };
  await r.api.beginBackgroundRecording({ ...r.input, resuming: true });
  assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
  assert.equal((await r.api.finishBackgroundRecording()).route.length, 2);
});

test('Pause ignores late samples and Resume preserves route without counting the pause gap', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.emit([sample(6.5244, 105000), sample(6.5245, 110000)]);
  await r.api.pauseBackgroundRecording();
  await r.emit([sample(6.526, 120000)]);
  const distance = r.api.getBackgroundRecording().session.distanceMeters;
  r.advance(60000);
  await r.api.beginBackgroundRecording({ ...r.input, resuming: true });
  await r.emit([sample(6.526, 165000)]);
  const session = r.api.getBackgroundRecording().session;
  assert.equal(session.route.length, 3); assert.equal(session.route[2].segmentStart, true);
  assert.equal(session.distanceMeters, distance);
});

test('reset during pending native startup releases the late service', async () => {
  const r = recorder(); let release;
  r.nativeStart = () => new Promise((resolve) => { release = resolve; });
  const starting = r.api.beginBackgroundRecording(r.input);
  await new Promise(setImmediate);
  const resetting = r.api.resetBackgroundRecording();
  release(); await starting; await resetting;
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().session, null);
});

test('Finish during pending native resume cancels startup without losing progress', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.emit([sample(6.5244, 105000)]); await r.api.pauseBackgroundRecording();
  let release; r.nativeStart = () => new Promise((resolve) => { release = resolve; });
  const resuming = r.api.beginBackgroundRecording({ ...r.input, resuming: true });
  await new Promise(setImmediate);
  const finishing = r.api.finishBackgroundRecording(); release(); await resuming;
  assert.equal((await finishing).route.length, 1);
  assert.equal(r.running, false);
});

test('headless relaunch restores the owner and persists further background points', async () => {
  const first = recorder(); await first.api.beginBackgroundRecording(first.input);
  await first.emit([sample(6.5244, 105000)]);
  const relaunched = recorder({ storage: first.storage, running: true });
  await relaunched.emit([sample(6.5245, 110000)]);
  assert.equal(relaunched.api.getBackgroundRecording().session.route.length, 2);
  await relaunched.api.restoreBackgroundRecording('walker');
  assert.equal(relaunched.api.getBackgroundRecording().session.status, 'tracking');
});

test('OS-terminated recording restores paused without adding the closed-app gap', async () => {
  const first = recorder(); await first.api.beginBackgroundRecording(first.input);
  await first.emit([sample(6.5244, 105000), sample(6.5245, 110000)]);
  const restored = recorder({ storage: first.storage }); restored.advance(3600000);
  await restored.api.restoreBackgroundRecording('walker');
  const session = restored.api.getBackgroundRecording().session;
  assert.equal(session.status, 'paused'); assert.equal(session.pauseReason, 'recovered');
  assert.equal(session.elapsedMs, 10000);
});

test('finished recovery retains the original save ID, type, date, and duration', async () => {
  const first = recorder(); await first.api.beginBackgroundRecording({ ...first.input, activityType: 'run' });
  first.advance(10000); const finished = await first.api.finishBackgroundRecording();
  const restored = recorder({ storage: first.storage }); restored.advance(86400000);
  await restored.api.restoreBackgroundRecording('walker');
  const retry = await restored.api.finishBackgroundRecording();
  assert.equal(retry.id, finished.id); assert.equal(retry.activityType, 'run');
  assert.equal(retry.completedAt, finished.completedAt); assert.equal(retry.elapsedMs, finished.elapsedMs);
});

test('account switching stops and clears the previous account recording', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.api.restoreBackgroundRecording('another-account');
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().session, null);
});

test('sign-out stops background recording but preserves a paused recoverable record', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.api.stopBackgroundRecordingOnSignOut();
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
});

test('stop failures are visible and retry stops the native service', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input); r.stopFailure = true;
  await r.api.pauseBackgroundRecording();
  assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
  assert.equal(r.api.getBackgroundRecording().issue, 'stop');
  r.stopFailure = false; await r.api.retryBackgroundStop();
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().issue, null);
});

test('storage failure prevents starting native recording and exposes recovery failure', async () => {
  const r = recorder(); r.storageFailure = true;
  await r.api.beginBackgroundRecording(r.input);
  assert.equal(r.starts, 0); assert.equal(r.api.getBackgroundRecording().issue, 'storage');
  assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
});

test('failed durable Finish remains retryable with its captured completion time', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  r.advance(10000); r.storageFailure = true;
  await assert.rejects(() => r.api.finishBackgroundRecording());
  const completedAt = r.api.getBackgroundRecording().session.completedAt;
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
  r.advance(60000); r.storageFailure = false;
  const finished = await r.api.finishBackgroundRecording();
  assert.equal(finished.elapsedMs, 10000); assert.equal(finished.completedAt, completedAt);
});

test('native errors and revoked background permissions pause without losing progress', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.emit([sample(6.5244, 105000)]); await r.fail();
  assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
  assert.equal(r.api.getBackgroundRecording().session.route.length, 1);
  await r.api.beginBackgroundRecording({ ...r.input, resuming: true });
  r.backgroundAccess = false; await r.api.refreshBackgroundRecording();
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().issue, 'permission');
});

test('native hook continues tracking on background and after its screen unmounts', async () => {
  const r = recorder();
  const h = harness('src/hooks/use-activity-tracking.native.ts', 'useActivityTracking', {
    '@/lib/activity-recording': core, '@/lib/background-activity': r.api,
    '@/services/health-data': { createHealthDataProvider: () => ({}) },
    '@/services/walks/session-steps': { readSessionSteps: async () => null },
  }, 'android');
  h.render('walker'); await h.advance(0); r.setTime(h.getTime());
  await h.render('walker').start();
  const start = r.now;
  await r.emit([sample(6.5244, start + 5000)]); h.render('walker');
  h.background(); await h.advance(60000);
  assert.equal(h.render('walker').status, 'tracking');
  assert.equal(h.render('walker').elapsedMs, 60000);
  h.unmount();
  await r.emit([sample(6.5245, start + 10000)]);
  assert.equal(r.api.getBackgroundRecording().session.route.length, 2);
  assert.equal(r.running, true);
});

test('web import does not register a native task', () => {
  const r = recorder({ platform: 'web' });
  assert.equal(r.api.getBackgroundRecording().session, null);
});

test('explicit foreground fallback records when background permission is denied and pauses on lock', async () => {
  const r = recorder(); r.backgroundAccess = false;
  await r.api.beginBackgroundRecording({ ...r.input, allowForegroundFallback: true });
  assert.equal(r.api.getBackgroundRecording().session.locationMode, 'foreground');
  assert.equal(r.starts, 0);
  r.foregroundSample(sample(6.5244, r.now + 5000));
  await new Promise(setImmediate);
  assert.equal(r.api.getBackgroundRecording().session.route.length, 1);
  r.advance(10000); r.background(); await new Promise(setImmediate);
  assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
});

test('stale sensor reads cannot overwrite finalized session steps', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  const before = r.api.getBackgroundRecording().session;
  const finished = await r.api.finishBackgroundRecording('walker');
  await r.api.updateRecordingSteps('walker', finished.id, 100, finished.segment, finished.status);
  await r.api.updateRecordingSteps('walker', before.id, 5, before.segment, before.status);
  assert.equal(r.api.getBackgroundRecording().session.steps, 100);
});

test('sign-out cancels pending permission setup before a native service starts', async () => {
  const r = recorder(); r.backgroundAccess = false;
  let release;
  const starting = r.api.beginBackgroundRecording({ ...r.input, confirmBackgroundAccess: () => new Promise((resolve) => { release = resolve; }) });
  await new Promise(setImmediate);
  await r.api.stopBackgroundRecordingOnSignOut(); release(true); await starting;
  assert.equal(r.starts, 0); assert.equal(r.api.getBackgroundRecording().isPreparing, false);
});

test('account change cancels pending permission setup and stale controls cannot stop the new walk', async () => {
  const r = recorder(); r.backgroundAccess = false;
  let release;
  const starting = r.api.beginBackgroundRecording({ ...r.input, confirmBackgroundAccess: () => new Promise((resolve) => { release = resolve; }) });
  await new Promise(setImmediate);
  await r.api.restoreBackgroundRecording('other'); release(true); await starting;
  assert.equal(r.starts, 0);
  r.backgroundAccess = true;
  await r.api.beginBackgroundRecording({ ...r.input, userId: 'other' });
  await r.api.pauseBackgroundRecording('walker');
  assert.equal(await r.api.finishBackgroundRecording('walker'), null);
  await r.api.resetBackgroundRecording('walker');
  assert.equal(r.api.getBackgroundRecording().session.userId, 'other');
  assert.equal(r.api.getBackgroundRecording().session.status, 'tracking');
});

test('a headless storage-read failure stops the native service rather than recording without a recovery copy', async () => {
  const r = recorder({ running: true }); r.readFailure = true;
  await r.emit([sample(6.5244, 105000)]);
  assert.equal(r.running, false); assert.equal(r.api.getBackgroundRecording().issue, 'storage');
});

test('a finalized recovery cannot resume and mutate a possibly already saved activity', async () => {
  const first = recorder(); await first.api.beginBackgroundRecording(first.input);
  first.advance(10000); const finished = await first.api.finishBackgroundRecording();
  const restored = recorder({ storage: first.storage });
  await restored.api.restoreBackgroundRecording('walker');
  await restored.api.beginBackgroundRecording({ ...restored.input, resuming: true });
  assert.equal(restored.starts, 0);
  const retry = await restored.api.finishBackgroundRecording();
  assert.equal(retry.id, finished.id); assert.equal(retry.completedDateKey, finished.completedDateKey);
});

test('background write failure stops recording while retaining the newest points in memory', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input);
  await r.emit([sample(6.5244, 105000)]); r.storageFailure = true;
  await r.emit([sample(6.5245, 110000)]);
  assert.equal(r.running, false);
  assert.equal(r.api.getBackgroundRecording().session.route.length, 2);
  assert.equal(r.api.getBackgroundRecording().session.status, 'paused');
});

test('account change still stops the service when saving the old recovery copy fails', async () => {
  const r = recorder(); await r.api.beginBackgroundRecording(r.input); r.storageFailure = true;
  await assert.rejects(() => r.api.restoreBackgroundRecording('other'));
  assert.equal(r.running, false);
});
