const test = require('node:test');
const { harness, loadTS, stepRecordHarness, assert } = require('./hook-harness.cjs');

function activityStore() {
  const records = new Map();
  let transactionCalls = 0;
  let failCommit = false;
  let subscriber;
  const firestore = {
    collection: (_db, ...parts) => parts.join('/'),
    doc: (_db, ...parts) => ({ path: parts.join('/'), id: parts.at(-1) ?? 'generated-id' }),
    getDocs: async () => ({ docs: [
      { id: 'walking-circle', data: () => ({ activityType: 'walk' }) },
      { id: 'running-circle', data: () => ({ activityType: 'run' }) },
    ] }),
    increment: (amount) => ({ increment: amount }),
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, callback) => {
      transactionCalls++;
      const writes = [];
      await callback({
        get: async (ref) => ({ exists: () => records.has(ref.path) }),
        set: (ref, data) => writes.push([ref.path, data]),
      });
      if (failCommit) throw new Error('offline');
      for (const [key, data] of writes) {
        const previous = records.get(key) ?? {};
        const next = { ...previous };
        for (const [field, value] of Object.entries(data)) {
          next[field] = value && typeof value === 'object' && 'increment' in value ? (previous[field] ?? 0) + value.increment : value;
        }
        records.set(key, next);
      }
    },
    onSnapshot: (_ref, callback) => { subscriber = callback; return () => {}; },
  };
  const api = loadTS('src/lib/activities.ts', {
    'firebase/firestore': firestore,
    '@/lib/firebase': { database: {}, requireFirebase: (db) => db },
    '@/lib/daily-steps': { getLocalTimeZone: () => 'Africa/Lagos' },
    '@/lib/route': loadTS('src/lib/route.ts'),
  });
  const input = {
    activityId: 'stable-id', activityType: 'walk', dateKey: '2026-10-03',
    distanceMeters: 250, durationMs: 180000, userId: 'walker',
    route: [{ latitude: 6.52, longitude: 3.37 }, { latitude: 6.53, longitude: 3.38, segmentStart: true }],
  };
  return { api, input, records, set fail(value) { failCommit = value; }, get calls() { return transactionCalls; }, emit(value) { subscriber(value); } };
}

test('retrying the same saved activity does not double circle totals', async () => {
  const store = activityStore();
  await store.api.saveActivity(store.input); await store.api.saveActivity(store.input);
  assert.equal(store.records.size, 2);
  const circle = store.records.get('circles/walking-circle/dailyActivities/2026-10-03/entries/walker');
  assert.equal(circle.activityCount, 1);
  assert.equal(circle.distanceMeters, 250);
  assert.equal(circle.durationMs, 180000);
});

test('activity retries retain their completion date and route breaks', async () => {
  const store = activityStore();
  store.fail = true;
  await assert.rejects(() => store.api.saveActivity(store.input));
  assert.equal(store.records.size, 0);
  store.fail = false; await store.api.saveActivity(store.input);
  const record = store.records.get('users/walker/activities/stable-id');
  assert.equal(record.dateKey, '2026-10-03');
  assert.equal(record.route[1].segmentStart, true);
});

test('reading saved routes retains segment markers and supports older routes', () => {
  const store = activityStore();
  let record;
  store.api.watchActivityRecord('walker', 'id', (value) => { record = value; }, () => {});
  store.emit({ exists: () => true, id: 'id', data: () => store.input });
  assert.equal(record.route[1].segmentStart, true);
  store.emit({ exists: () => true, id: 'id', data: () => ({ ...store.input, route: [{ latitude: 6.52, longitude: 3.37 }] }) });
  assert.equal(record.route.length, 1);
  assert.equal(record.route[0].segmentStart, undefined);
});

test('Android Back cannot discard an activity while it is saving', () => {
  let discarded = 0;
  const { ActivitySummarySheet } = loadTS('src/components/activity-summary-sheet.tsx', {
    react: { useMemo: (factory) => factory() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', View: 'View', ActivityIndicator: 'Spinner', StyleSheet: { create: (styles) => styles } },
    '@expo/vector-icons': { Ionicons: 'Icon', MaterialCommunityIcons: 'Icon' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/design-system/use-app-theme': { useAppColors: () => ({ accent: '#08f', onAccent: '#fff', overlay: '#000', card: '#fff', border: '#ddd', soft: '#eee', ink: '#111', muted: '#555', warningContent: '#a60', dangerContent: '#a00', accentPressed: '#06c' }) },
  });
  const props = { activityType: 'walk', distanceMeters: 100, durationMs: 60000, isSaving: true, visible: true, saveError: false, onSave() {}, onDiscard() { discarded++; } };
  ActivitySummarySheet(props).props.onRequestClose();
  assert.equal(discarded, 0);
  ActivitySummarySheet({ ...props, isSaving: false }).props.onRequestClose();
  assert.equal(discarded, 1);
});

test('slow step writes coalesce to the latest pending count', async () => {
  const saved = [];
  let release;
  const { h, input } = stepRecordHarness({ daily: { saveDailySteps: async (entry) => {
    saved.push(entry.steps);
    if (saved.length === 1) await new Promise((done) => { release = done; });
  } } });
  h.render(input); await h.advance(15000);
  for (let i = 1; i <= 10; i++) { h.render({ ...input, steps: i * 100 }); await h.advance(15000); }
  release(); await h.advance(0);
  assert.deepEqual(saved, [10, 1000]);
});

test('midnight flush keeps the old day final count separate from the new day', async () => {
  const { h, input, personal: saved } = stepRecordHarness();
  h.render(input); await h.advance(0);
  h.render({ ...input, steps: 99 });
  h.render({ ...input, steps: 0, dateKey: '2026-10-04', circleDateKey: '2026-10-04' }); await h.advance(0);
  assert.ok(saved.some((record) => record.dateKey === '2026-10-03' && record.steps === 99));
  assert.ok(saved.some((record) => record.dateKey === '2026-10-04' && record.steps === 0));
});

test('history subscription setup errors show a recoverable error state', async () => {
  const h = harness('src/hooks/use-daily-step-history.ts', 'useDailyStepHistory', {
    '@/lib/daily-steps': { getLocalDateKey: () => '2026-10-03', watchStepHistory() { throw new Error('not configured'); } },
  });
  h.render('walker'); await h.advance(0);
  assert.equal(h.render('walker').status, 'error');
});

test('local date hook updates at midnight without a sensor event', async () => {
  const h = harness('src/hooks/use-local-date-key.ts', 'useLocalDateKey', {
    '@/lib/daily-steps': { getLocalDateKey: () => new Date(h.getTime()).toLocaleDateString('en-CA') },
  });
  const first = h.render(); await h.advance(86400000);
  assert.notEqual(h.render(), first);
});

test('an old account sync error is not displayed for the next account', async () => {
  const { h, input } = stepRecordHarness({ daily: { saveDailySteps: async () => { throw new Error('offline'); } } });
  const oldInput = { ...input, userId: 'old' };
  h.render(oldInput); await h.advance(15000);
  assert.equal(h.render(oldInput).syncStatus, 'error');
  assert.equal(h.render({ ...oldInput, userId: 'new', shouldSave: false }).syncStatus, 'idle');
});
