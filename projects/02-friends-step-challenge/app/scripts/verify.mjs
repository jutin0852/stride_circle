import { createConnection } from 'node:net';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const nodeCommand = process.execPath;
const expoCommand = join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'expo.cmd' : 'expo');
const mode = process.argv.includes('--full') ? 'full' : process.argv.includes('--visual') ? 'visual' : process.argv.includes('--fast') ? 'fast' : 'quick';
const activeChildren = new Set();
const serverChildren = [];
let shuttingDown = false;
let harnessTempDirectory;
const verificationCacheDirectory = join('.artifacts', 'verify-cache');
const appTypeScriptBuildInfo = join(verificationCacheDirectory, 'app.tsbuildinfo');
const functionsTypeScriptBuildInfo = join(verificationCacheDirectory, 'functions.tsbuildinfo');
const appEslintCache = join(verificationCacheDirectory, 'app-eslint.cache');
const functionsEslintCache = join(verificationCacheDirectory, 'functions-eslint.cache');

function localTool(name, scope = projectRoot) {
  const suffix = process.platform === 'win32' ? '.cmd' : '';
  const tool = join(scope, 'node_modules', '.bin', `${name}${suffix}`);
  if (!existsSync(tool)) throw new Error(`Required local tool is missing: ${tool}. Run npm ci before verification.`);
  return tool;
}

class VerificationFailure extends Error {
  constructor(label, message, output = '') {
    super(message);
    this.label = label;
    this.output = output;
  }
}

function elapsed(start) {
  return `${((Number(process.hrtime.bigint() - start) / 1e6) / 1000).toFixed(1)}s`;
}

function tail(value, limit = 12_000) {
  const text = value.trim();
  return text.length > limit ? `…${text.slice(-limit)}` : text;
}

function prepareCommand(command, args) {
  if (process.platform !== 'win32' || !command.toLowerCase().endsWith('.cmd')) return { command, args };
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const commandFromRoot = command.startsWith(projectRoot)
    ? relative(projectRoot, command).replaceAll('/', '\\')
    : command;
  const commandToken = /[\s&()]/.test(commandFromRoot) ? quote(commandFromRoot) : commandFromRoot;
  return {
    command: process.env.ComSpec ?? 'cmd.exe',
    args: ['/d', '/s', '/c', [commandToken, ...args.map((value) => /[\s&()]/.test(String(value)) ? quote(value) : String(value))].join(' ')],
  };
}

function createChild(command, args, extraEnvironment = {}, { detached = false, useHarnessTemp = false } = {}) {
  const output = { stdout: '', stderr: '' };
  const prepared = prepareCommand(command, args);
  const child = spawn(prepared.command, prepared.args, {
    cwd: projectRoot,
    detached,
    env: {
      ...process.env,
      ...(useHarnessTemp && harnessTempDirectory ? { TEMP: harnessTempDirectory, TMP: harnessTempDirectory, TMPDIR: harnessTempDirectory } : {}),
      CI: '1',
      ...extraEnvironment,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.stdout?.on('data', (chunk) => { output.stdout += chunk.toString(); });
  child.stderr?.on('data', (chunk) => { output.stderr += chunk.toString(); });
  child.on('error', (error) => { output.stderr += `${error.message}\n`; });
  child.on('close', () => { activeChildren.delete(child); });
  activeChildren.add(child);
  return { child, output };
}

async function terminateChild(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
    return;
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
      resolve();
    }, 2_000);
    child.once('close', () => { clearTimeout(timer); resolve(); });
  });
}

async function stopAllChildren() {
  const children = [...new Set([...activeChildren, ...serverChildren.map(({ child }) => child)])];
  await Promise.all(children.map((child) => terminateChild(child)));
}

async function prepareHarnessTempDirectory() {
  harnessTempDirectory = join(projectRoot, '.artifacts', `verify-tmp-${process.pid}`);
  await mkdir(harnessTempDirectory, { recursive: true });
  await mkdir(join(projectRoot, verificationCacheDirectory), { recursive: true });
}

function runCommand(label, command, args, { timeoutMs = 300_000, environment = {}, useHarnessTemp = false } = {}) {
  const start = process.hrtime.bigint();
  let processError;
  const { child, output } = createChild(command, args, environment, { useHarnessTemp });

  return new Promise((resolve) => {
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      void terminateChild(child);
    }, timeoutMs);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, output: `${output.stdout}\n${output.stderr}`, duration: elapsed(start) });
    };

    child.once('error', (error) => {
      processError = error;
      finish({ code: null, signal: null });
    });
    child.once('close', (code, signal) => {
      finish({ code: timedOut ? null : code, signal: timedOut ? 'TIMEOUT' : signal, error: processError });
    });
  }).then((result) => {
    if (result.code !== 0) {
      const reason = result.signal === 'TIMEOUT'
        ? `timed out after ${timeoutMs / 1000}s`
        : result.error?.message ?? (result.signal ? `ended with ${result.signal}` : `exited with code ${result.code}`);
      throw new VerificationFailure(label, reason, result.output);
    }
    return result;
  });
}

function getFastChecks() {
  return [
    ['TypeScript typecheck', localTool('tsc'), ['--noEmit', '--incremental', '--tsBuildInfoFile', appTypeScriptBuildInfo]],
    ['App lint', localTool('eslint'), ['src', '--cache', '--cache-location', appEslintCache]],
    ['Functions lint', localTool('eslint'), ['functions/src', '--cache', '--cache-location', functionsEslintCache]],
    ['Vitest tests', localTool('vitest'), ['run'], { useHarnessTemp: true }],
    ['React Native component tests', nodeCommand, ['scripts/run-rn-tests.mjs']],
    ['Functions build', localTool('tsc', join(projectRoot, 'functions')), ['-p', 'functions/tsconfig.json', '--incremental', '--tsBuildInfoFile', functionsTypeScriptBuildInfo]],
  ];
}

function getQuickChecks() {
  return [
    ['TypeScript typecheck (incremental)', localTool('tsc'), ['--noEmit', '--incremental', '--tsBuildInfoFile', appTypeScriptBuildInfo]],
    ['App lint (cached)', localTool('eslint'), ['src', '--cache', '--cache-location', appEslintCache]],
    ['Vitest tests', localTool('vitest'), ['run'], { useHarnessTemp: true }],
  ];
}

async function runChecks(title, checks) {
  console.log(`\n${title}`);
  let passed = 0;
  const start = process.hrtime.bigint();

  for (let index = 0; index < checks.length; index += 1) {
    const [label, command, args, options] = checks[index];
    process.stdout.write(`[${index + 1}/${checks.length}] ${label}... `);
    try {
      const result = await runCommand(label, command, args, options);
      passed += 1;
      console.log(`PASS (${result.duration})`);
    } catch (error) {
      console.log('FAIL');
      if (error instanceof VerificationFailure) {
        console.error(`\nFailed check: ${error.label}\n${error.message}`);
        if (tail(error.output)) console.error(`\n${tail(error.output)}\n`);
      }
      throw error;
    }
  }

  console.log(`${title}: ${passed}/${checks.length} passed in ${elapsed(start)}`);
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const finish = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function waitForHttp(url, description, children, timeoutMs = 60_000, { bundle = false } = {}) {
  const start = Date.now();
  let attempts = 0;
  while (Date.now() - start < timeoutMs && (!bundle || attempts < 2)) {
    attempts += 1;
    if (children.some(({ child }) => child.exitCode !== null)) {
      throw new Error(`${description} stopped before becoming ready.`);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(bundle ? 30_000 : 2_000, timeoutMs - (Date.now() - start)));
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.status >= 200 && response.status < 400) {
        if (bundle) await response.arrayBuffer();
        return;
      }
    } catch {
      // The next attempt handles startup races and transient Metro responses.
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`${description} was not ready at ${url} within ${timeoutMs / 1000}s${bundle ? ' (at most two bundle attempts)' : ''}. Infrastructure verification stopped; no automatic server restart.`);
}

async function startPreviewEnvironment() {
  if (!existsSync(expoCommand)) {
    throw new Error(`Local Expo CLI was not found at ${expoCommand}. Run npm ci before full verification.`);
  }

  for (const port of [8085, 8090, 8091]) {
    if (await isPortOpen(port) || await isPortOpen(port, '::1')) throw new Error(`Port ${port} is already in use. Stop the existing local process and retry verification.`);
  }

  const metro = createChild(expoCommand, ['start', '--localhost', '--port', '8085'], {
    EXPO_NO_DOCTOR: '1',
    EXPO_NO_TELEMETRY: '1',
  }, { detached: process.platform !== 'win32' });
  serverChildren.push(metro);
  await waitForHttp('http://localhost:8085/status', 'Expo Metro', [metro]);

  const home = createChild(nodeCommand, ['scripts/home-preview-server.mjs'], {
    HOME_METRO_URL: 'http://localhost:8085',
  }, { detached: process.platform !== 'win32' });
  const history = createChild(nodeCommand, ['scripts/history-preview-server.mjs'], {
    HISTORY_METRO_URL: 'http://localhost:8085',
  }, { detached: process.platform !== 'win32' });
  serverChildren.push(home, history);

  await Promise.all([
    waitForHttp('http://127.0.0.1:8091/', 'Home preview server', [home]),
    waitForHttp('http://127.0.0.1:8090/', 'History preview server', [history]),
  ]);
  await Promise.all([
    waitForHttp('http://127.0.0.1:8091/scripts/home-preview.bundle?platform=web&dev=true&hot=false&lazy=false', 'Home Metro bundle', [metro, home], 60_000, { bundle: true }),
    waitForHttp('http://127.0.0.1:8090/scripts/history-preview.bundle?platform=web&dev=true&hot=false&lazy=false', 'History Metro bundle', [metro, history], 60_000, { bundle: true }),
  ]);
}

async function main() {
  if (process.argv.includes('--list')) {
    const quick = ['TypeScript', 'App lint', 'Vitest'];
    const fast = [...quick, 'Functions lint/build', 'React Native tests'];
    const visual = ['Metro readiness (bounded)', 'Home UI preview', 'History UI preview'];
    console.log((mode === 'quick' ? quick : mode === 'fast' ? fast : mode === 'visual' ? visual : [...fast, 'Expo Doctor', 'Firestore Rules emulator', ...visual]).join('\n'));
    return;
  }
  await prepareHarnessTempDirectory();
  if (mode === 'quick') {
    await runChecks('Quick verification', getQuickChecks());
    return;
  }

  if (mode !== 'visual') {
    await runChecks('Fast verification', getFastChecks());
    if (mode === 'fast') return;

  await runChecks('Deep verification', [
    ['Expo Doctor', npxCommand, ['expo-doctor'], { timeoutMs: 180_000 }],
    ['Firestore Rules emulator tests', nodeCommand, ['scripts/run-emulator-tests.mjs'], { timeoutMs: 300_000 }],
  ]);
  }

  console.log('\nStarting isolated Home and History preview environment...');
  await startPreviewEnvironment();
  await runChecks('Preview verification', [
    ['Home UI preview', nodeCommand, ['scripts/check-home-preview.mjs'], { timeoutMs: 300_000 }],
    ['History UI preview', nodeCommand, ['scripts/check-history-preview.mjs'], { timeoutMs: 300_000 }],
  ]);
}

async function handleSignal(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`\nReceived ${signal}; stopping verification processes...`);
  await stopAllChildren();
  process.exitCode = 130;
}

process.once('SIGINT', () => { void handleSignal('SIGINT'); });
process.once('SIGTERM', () => { void handleSignal('SIGTERM'); });

try {
  const started = process.hrtime.bigint();
  console.log(`Stride Circle ${mode} verification`);
  await main();
  console.log(process.argv.includes('--list') ? '\nPlan only; no checks executed.' : `\nVerification passed in ${elapsed(started)}.`);
} catch (error) {
  if (!(error instanceof VerificationFailure)) console.error(`\nVerification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await stopAllChildren();
  if (harnessTempDirectory) await rm(harnessTempDirectory, { recursive: true, force: true });
}
