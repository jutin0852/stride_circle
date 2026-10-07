const test = require('node:test');
const { harness, locationMock, loadTS, stepRecordHarness, assert } = require('./hook-harness.cjs');

function activityHarness(location = locationMock()) {
  return { location, h: harness('src/hooks/use-activity-tracking.ts', 'useActivityTracking', { 'expo-location': location.api }) };
}

test('GPS acquisition gets the full grace period before reporting weak signal', async () => {
  const { h } = activityHarness();
  await h.render().start(); h.render();
  await h.advance(14000);
  assert.equal(h.render().gpsSignal, 'acquiring');
  await h.advance(2000);
  assert.equal(h.render().gpsSignal, 'weak');
});

test('finishing during pending resume keeps progress and releases the late watcher', async () => {
  const { h, location } = activityHarness();
  await h.render().start(); location.emit(6.5244); location.emit(6.5245);
  h.render().pause();
  let complete;
  location.api.watchPositionAsync = () => new Promise((resolve) => { complete = resolve; });
  const pending = h.render().resume(); await h.advance(0);
  const result = h.render().finish();
  assert.equal(result.route.length, 2);
  let removed = false;
  complete({ remove() { removed = true; } }); await pending;
  assert.equal(removed, true);
  assert.equal(h.render().status, 'finished');
});

test('pause/resume keeps earlier route and does not count the pause gap', async () => {
  const { h, location } = activityHarness();
  let activity = h.render(); await activity.start();
  location.emit(6.5244); location.emit(6.5245);
  activity = h.render(); const distance = activity.distanceMeters;
  activity.pause(); activity = h.render();
  await h.advance(60000); await activity.resume(); location.emit(6.5260);
  activity = h.render();
  assert.equal(activity.route.length, 3);
  assert.equal(activity.route[2].segmentStart, true);
  assert.equal(activity.distanceMeters, distance);
});

test('weak GPS recovery keeps earlier points without a false connecting segment', async () => {
  const { h, location } = activityHarness();
  await h.render().start();
  location.emit(6.5244); location.emit(6.5245);
  const distance = h.render().distanceMeters;
  location.emit(6.5250, 100); location.emit(6.5260);
  const activity = h.render();
  assert.equal(activity.route.length, 3);
  assert.equal(activity.route[2].segmentStart, true);
  assert.equal(activity.distanceMeters, distance);
});

test('long GPS gaps do not create artificial distance', async () => {
  const { h, location } = activityHarness();
  await h.render().start();
  location.emit(6.5244); location.emit(6.5245);
  const before = h.render().distanceMeters;
  location.emit(6.5250, 5, 30000);
  assert.equal(h.render().distanceMeters, before);
  assert.equal(h.render().route.at(-1).segmentStart, true);
});

test('failed resume keeps a walk finishable and retryable', async () => {
  const { h, location } = activityHarness();
  await h.render().start(); location.emit(6.5244); location.emit(6.5245);
  await h.advance(60000); h.render().pause();
  location.disable(); await h.render().resume();
  assert.equal(h.render().status, 'paused');
  location.enable(); await h.render().resume();
  assert.equal(h.render().status, 'tracking');
  const finished = h.render().finish();
  assert.equal(finished.route.length, 2);
  assert.ok(finished.durationMs >= 60000);
});

test('failed resume can be finished directly', async () => {
  const { h, location } = activityHarness();
  await h.render().start(); location.emit(6.5244); location.emit(6.5245);
  h.render().pause(); location.disable(); await h.render().resume();
  assert.equal(h.render().finish().route.length, 2);
});

test('Finish uses the latest GPS data even before the next render', async () => {
  const { h, location } = activityHarness();
  const activity = h.render(); await activity.start();
  location.emit(6.5244); location.emit(6.5245);
  const finished = activity.finish();
  assert.equal(finished.route.length, 2);
  assert.ok(finished.distanceMeters > 10);
  assert.equal(activity.finish(), null);
});

test('repeated Start taps create one watcher', async () => {
  const { h, location } = activityHarness();
  const activity = h.render();
  await Promise.all([activity.start(), activity.start(), activity.start()]);
  assert.equal(location.watches, 1);
});

test('reset cancels pending setup and removes a late watcher', async () => {
  const location = locationMock();
  let resolve;
  location.api.watchPositionAsync = () => new Promise((done) => { resolve = done; });
  const { h } = activityHarness(location);
  const activity = h.render();
  const setup = activity.start(); await h.advance(0);
  activity.reset();
  let removed = false;
  resolve({ remove() { removed = true; } }); await setup;
  assert.equal(removed, true);
  assert.equal(h.render().status, 'idle');
});

test('backgrounding pauses duration and preserves recording for resume', async () => {
  const { h, location } = activityHarness();
  await h.render().start(); h.render(); location.emit(6.5244); location.emit(6.5245);
  await h.advance(10000); h.background();
  const paused = h.render();
  assert.equal(paused.status, 'paused'); assert.equal(paused.pauseReason, 'background');
  await h.advance(60000);
  assert.equal(h.render().elapsedMs, paused.elapsedMs);
  assert.equal(h.render().finish().route.length, 2);
});

test('watcher runtime error preserves data and stops the timer', async () => {
  const { h, location } = activityHarness();
  await h.render().start(); location.emit(6.5244); location.emit(6.5245);
  location.fail();
  assert.equal(h.render().status, 'paused');
  assert.equal(h.render().pauseReason, 'gps-error');
  assert.equal(h.render().finish().route.length, 2);
});

test('route splitting and downsampling preserve interruption boundaries', () => {
  const { splitRoute, simplifyRoute } = loadTS('src/lib/route.ts');
  const route = Array.from({ length: 600 }, (_, i) => ({ latitude: i, longitude: 0, ...(i === 201 ? { segmentStart: true } : {}) }));
  const saved = simplifyRoute(route);
  assert.equal(saved.length, 250);
  assert.equal(saved[0].latitude, 0);
  assert.equal(saved.at(-1).latitude, 599);
  const segments = splitRoute(saved);
  assert.equal(segments.length, 2);
  assert.ok(segments[0].at(-1).latitude < 201);
  assert.ok(segments[1][0].latitude >= 201);
});

test('continuous health updates synchronize the latest daily total within the bounded wait', async () => {
  const { h, input, personal, circles } = stepRecordHarness();
  for (let i = 0; i < 20; i++) { h.render({ ...input, steps: i * 5 }); await h.advance(3000); }
  assert.ok(personal.length >= 1);
  assert.equal(personal.at(-1).steps, 95);
  assert.equal(circles.length, personal.length);
  assert.equal(circles.at(-1).dateKey, input.dateKey);
});

test('offline cumulative totals remain queued and sync after the app returns online', async () => {
  let online = false;
  const { h, input, personal, pending } = stepRecordHarness({ daily: { saveDailySteps: async (entry) => {
    if (!online) throw new Error('offline');
    personal.push(entry);
  } } });
  h.render({ ...input, steps: 99 }); await h.advance(15000);
  assert.equal(pending[0].steps, 99);
  online = true; h.foreground(); await h.advance(0);
  assert.equal(personal.at(-1).steps, 99);
  assert.equal(pending.length, 0);
});

test('a newly selected circle receives the existing daily total', async () => {
  const { h, input, circles } = stepRecordHarness();
  h.render({ ...input, circleId: undefined, circleDateKey: undefined }); await h.advance(15000);
  h.render(input); await h.advance(15000);
  assert.ok(circles.some((entry) => entry.circleId === 'one' && entry.steps === 10));
});

test('failed circle sync preserves the pending snapshot and retries after reconnect', async () => {
  let fail = true;
  const { h, input, personal, pending } = stepRecordHarness({ circles: { saveCircleDailySteps: async () => { if (fail) throw new Error('offline'); } } });
  h.render(input); await h.advance(15000);
  assert.equal(h.render(input).syncStatus, 'error');
  assert.equal(h.render(input).savedSteps, 10);
  assert.equal(pending.length, 1);
  fail = false; h.foreground(); await h.advance(0);
  assert.equal(h.render(input).syncStatus, 'saved');
  assert.equal(personal.length, 2);
});

test('date changes flush the old captured total before syncing the new day', async () => {
  const { h, input, personal } = stepRecordHarness();
  h.render(input); await h.advance(0);
  h.render({ ...input, steps: 99 });
  h.render({ ...input, dateKey: '2026-10-04', circleDateKey: '2026-10-04', steps: 0 }); await h.advance(0);
  assert.ok(personal.some((entry) => entry.dateKey === '2026-10-03' && entry.steps === 99));
  assert.ok(personal.some((entry) => entry.dateKey === '2026-10-04' && entry.steps === 0));
});

test('late writes retain their captured date and account', async () => {
  const personal = [];
  let release;
  const { h, input } = stepRecordHarness({ daily: { saveDailySteps: async (entry) => {
    personal.push(entry);
    if (personal.length === 1) await new Promise((resolve) => { release = resolve; });
  } } });
  h.render(input); await h.advance(15000);
  h.render({ ...input, dateKey: '2026-10-04', circleDateKey: '2026-10-04', steps: 0 });
  await h.advance(15000); release(); await h.advance(0);
  assert.equal(personal[0].dateKey, '2026-10-03');
  assert.equal(personal[1].dateKey, '2026-10-04');
  assert.equal(h.render({ ...input, dateKey: '2026-10-04', circleDateKey: '2026-10-04', steps: 0 }).savedSteps, 0);
});

function sensorHarness() {
  let callback;
  let steps = 0;
  let reads = 0;
  const provider = {
    source: 'health-connect', backgroundMode: 'health-connect-background-read', canReadDailyTotals: true,
    isAvailable: async () => true,
    getPermissionStatus: async () => ({ granted: true, status: 'granted' }),
    getDailySteps: async () => { reads++; return steps; },
    requestPermission: async () => ({ granted: true }),
    subscribeToStepUpdates: (onChange) => { callback = onChange; return { remove() { callback = undefined; } }; },
    openHealthSettings: async () => {},
  };
  const h = harness('src/hooks/use-step-tracking.ts', 'useStepTracking', {
    '@/services/health-data': { createHealthDataProvider: () => provider },
    '@/lib/daily-steps': { getLocalDateKey: (date) => date.toISOString().slice(0, 10) },
  }, 'android');
  return { h, provider, get reads() { return reads; }, emit(value) { steps = value; void callback?.(); } };
}

test('Android Health Connect updates refresh the provider-sourced cumulative daily total', async () => {
  const { h, emit } = sensorHarness();
  h.render(); await h.advance(0);
  emit(300); await h.advance(0);
  assert.equal(h.render().todaySteps, 300);
  assert.equal(h.render().source, 'health-connect');
});

test('Android foreground recovery refreshes cumulative data rather than adding events locally', async () => {
  const { h, provider, emit } = sensorHarness();
  h.render(); await h.advance(0);
  emit(300); await h.advance(0);
  provider.getDailySteps = async () => 305;
  h.background(); h.foreground(); await h.advance(0);
  assert.equal(h.render().todaySteps, 305);
});

test('History responds to saved data and ignores unsubscribed account callbacks', () => {
  const callbacks = [];
  let stopped = 0;
  const h = harness('src/hooks/use-daily-step-history.ts', 'useDailyStepHistory', {
    '@/lib/daily-steps': { getLocalDateKey: () => '2026-10-03', watchStepHistory(_user, _range, callback) { callbacks.push(callback); return () => { stopped++; }; } },
  });
  h.render('walker'); callbacks[0]([{ dateKey: '2026-10-03', steps: 10 }]);
  assert.equal(h.render('walker').records[0].steps, 10);
  callbacks[0]([{ dateKey: '2026-10-03', steps: 20 }]);
  assert.equal(h.render('walker').records[0].steps, 20);
  h.render('other'); callbacks[0]([{ steps: 999 }]);
  callbacks[1]([{ dateKey: '2026-10-03', steps: 5 }]);
  assert.equal(h.render('other').records[0].steps, 5);
  assert.equal(stopped, 1);
});
