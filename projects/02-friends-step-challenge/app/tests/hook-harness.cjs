// Read-only regression probes against the actual hooks. No device or Firebase writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('../node_modules/typescript');

function harness(file, exportName, mocks, platform = 'ios') {
  let cursor = 0;
  let now = new Date('2026-10-03T10:00:00Z').getTime();
  let nextTimer = 0;
  const listeners = new Set();
  const appState = { currentState: 'active', addEventListener(_name, cb) { listeners.add(cb); return { remove() { listeners.delete(cb); } }; } };
  const slots = [];
  const timers = new Map();
  const pending = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    memo: (component) => component,
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (value) => {
        slots[i].value = typeof value === 'function' ? value(slots[i].value) : value;
      }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { current: initial };
      return slots[i];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: fn, deps };
      return slots[i].value;
    },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: factory(), deps };
      return slots[i].value;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (slots[i] && same(slots[i].deps, deps)) return;
      pending.push(() => {
        slots[i]?.cleanup?.();
        slots[i] = { deps, cleanup: fn() };
      });
    },
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  function timer(fn, delay, repeat) {
    const id = ++nextTimer;
    timers.set(id, { fn, due: now + delay, delay, repeat });
    return id;
  }
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-native' && !(name in mocks)) return { AppState: appState };
      if (name in mocks) return mocks[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    Date: ClockDate, process: { env: { EXPO_OS: platform } },
    setTimeout: (fn, delay) => timer(fn, delay, false),
    setInterval: (fn, delay) => timer(fn, delay, true),
    clearTimeout: (id) => timers.delete(id),
    clearInterval: (id) => timers.delete(id),
  });
  return {
    render(input) {
      cursor = 0;
      const result = module.exports[exportName](input);
      pending.splice(0).forEach((effect) => effect());
      return result;
    },
    background() { appState.currentState = 'background'; listeners.forEach((cb) => cb('background')); },
    foreground() { appState.currentState = 'active'; listeners.forEach((cb) => cb('active')); },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
    getTime() { return now; },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const entry = [...timers].filter(([, t]) => t.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!entry) break;
        const [id, t] = entry;
        now = t.due;
        if (t.repeat) t.due += t.delay;
        else timers.delete(id);
        t.fn();
        await Promise.resolve();
        await Promise.resolve();
      }
      now = end;
      for (let i = 0; i < 8; i++) await Promise.resolve();
      // Let complete promise chains drain without imposing an arbitrary depth.
      await new Promise(setImmediate);
    },
  };
}


function locationMock() {
  let callback;
  let errorCallback;
  let services = true;
  let timestamp = new Date('2026-10-03T10:00:00Z').getTime();
  let watches = 0;
  let removes = 0;
  return {
    api: {
      Accuracy: { High: 4 },
      hasServicesEnabledAsync: async () => services,
      getForegroundPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
      requestForegroundPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
      watchPositionAsync: async (_options, cb, error) => {
        callback = cb; errorCallback = error; watches++;
        return { remove() { removes++; callback = null; } };
      },
    },
    emit(latitude, accuracy = 5, delta = 5000) {
      timestamp += delta;
      callback({ coords: { latitude, longitude: 3.3792, accuracy }, timestamp });
    },
    fail() { errorCallback('GPS unavailable'); },
    disable() { services = false; },
    enable() { services = true; },
    get watches() { return watches; },
    get removes() { return removes; },
  };
}

function dateKey(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function loadTS(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  }, Date, ...globals });
  return module.exports;
}

function stepRecordHarness(overrides = {}) {
  const personal = [];
  const circles = [];
  const pending = [];
  const entryKey = (entry) => `${entry.userId}:${entry.dateKey}:${entry.circleId ?? ''}:${entry.circleDateKey ?? ''}`;
  const h = harness('src/hooks/use-daily-step-record.ts', 'useDailyStepRecord', {
    '@/features/home/home-model': { getCircleDayStart: (end) => new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())) },
    '@/domain/dates': { getDateKeyInTimeZone: (date) => date.toISOString().slice(0, 10) },
    '@/lib/daily-steps': {
      getLocalDateKey: () => '2026-10-03',
      loadDailySteps: async () => 0,
      saveDailySteps: async (input) => personal.push(input),
      ...overrides.daily,
    },
    '@/lib/circles': { saveCircleDailySteps: async (input) => circles.push(input), ...overrides.circles },
    '@/services/health-data/daily-step-sync-queue': {
      getPendingDailyStepSync: async (userId, day) => pending.filter((entry) => entry.userId === userId && entry.dateKey === day),
      savePendingDailyStepSync: async (entry) => {
        const key = entryKey(entry);
        const index = pending.findIndex((candidate) => entryKey(candidate) === key);
        if (index >= 0) pending[index] = entry;
        else pending.push(entry);
      },
      removePendingDailyStepSync: async (entry) => {
        const key = entryKey(entry);
        const index = pending.findIndex((candidate) => entryKey(candidate) === key);
        if (index >= 0) pending.splice(index, 1);
      },
      ...overrides.queue,
    },
  });
  const input = { circleId: 'one', circleDateKey: '2026-10-03', dateKey: '2026-10-03', shouldSave: true, source: 'expo-pedometer', steps: 10, userId: 'walker' };
  return { h, input, personal, circles, pending };
}

module.exports = { harness, locationMock, dateKey, loadTS, stepRecordHarness, assert };
