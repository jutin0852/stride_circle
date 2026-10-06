import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const jestEntry = join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js');
const realpathPreload = join(projectRoot, 'scripts', 'jest-realpath-preload.cjs');
const cacheDirectory = join(projectRoot, '.artifacts', `jest-cache-${process.pid}`);
const forwardedArgs = process.argv.slice(2);
let config = 'jest.config.js';
const jestArgs = [];

const hasWorkerOverride = forwardedArgs.some((argument) => (
  argument === '--runInBand'
  || argument === '--maxWorkers'
  || argument.startsWith('--maxWorkers=')
));
const workerArgs = hasWorkerOverride
  ? []
  : process.env.JEST_RUN_IN_BAND === '1'
    ? ['--runInBand']
    : ['--maxWorkers', process.env.JEST_MAX_WORKERS ?? '2'];

for (let index = 0; index < forwardedArgs.length; index += 1) {
  const argument = forwardedArgs[index];
  if (argument === '--config') {
    config = forwardedArgs[index + 1] ?? config;
    index += 1;
  } else if (argument.startsWith('--config=')) {
    config = argument.slice('--config='.length);
  } else {
    jestArgs.push(argument);
  }
}

if (!existsSync(jestEntry)) {
  console.error(`Jest is not installed at ${jestEntry}. Run npm ci before running React Native tests.`);
  process.exitCode = 1;
} else {
  await mkdir(cacheDirectory, { recursive: true });

  const child = spawn(process.execPath, [
    '-r',
    realpathPreload,
    jestEntry,
    '--config',
    config,
    '--cacheDirectory',
    cacheDirectory,
    '--testTimeout',
    '90000',
    ...workerArgs,
    '--passWithNoTests',
    ...jestArgs,
  ], {
    cwd: projectRoot,
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
    windowsHide: true,
  });

  const cleanup = async () => {
    await rm(cacheDirectory, { recursive: true, force: true });
  };

  child.on('error', async (error) => {
    console.error(error.message);
    await cleanup();
    process.exitCode = 1;
  });

  child.on('exit', async (code, signal) => {
    await cleanup();
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exitCode = code ?? 1;
    }
  });
}
