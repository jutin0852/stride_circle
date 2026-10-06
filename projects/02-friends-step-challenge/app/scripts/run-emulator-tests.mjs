import { existsSync, readdirSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const toolsDirectory = join(projectRoot, '.tools');
const harnessConfigDirectory = join(projectRoot, '.artifacts', 'firebase-config');
const portableJdk = existsSync(toolsDirectory)
  ? readdirSync(toolsDirectory, { withFileTypes: true }).find(
      (entry) => entry.isDirectory() && entry.name.startsWith('jdk-21'),
    )
  : undefined;

const environment = {
  ...process.env,
  XDG_CONFIG_HOME: harnessConfigDirectory,
};

if (portableJdk) {
  environment.JAVA_HOME = join(toolsDirectory, portableJdk.name);
  environment.PATH = `${join(environment.JAVA_HOME, 'bin')}${process.platform === 'win32' ? ';' : ':'}${environment.PATH ?? ''}`;
} else {
  console.warn('No portable JDK 21 was found in .tools; using the system Java installation.');
}

const firebaseCli = join(projectRoot, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
if (!existsSync(firebaseCli)) throw new Error(`Firebase CLI is not installed at ${firebaseCli}. Run npm ci before emulator verification.`);
const command = process.execPath;
const quoteForShell = (value) => process.platform === 'win32'
  ? `"${value.replaceAll('"', '\\"')}"`
  : `'${value.replaceAll("'", "'\\''")}'`;
const argumentsForCommand = [
  firebaseCli,
  'emulators:exec',
  '--project',
  'demo-stride-circle',
  '--only',
  'auth,firestore',
  `${quoteForShell(process.execPath)} ${quoteForShell(join(projectRoot, 'scripts', 'run-rn-tests.mjs'))} --config jest.rules.config.js`,
];

const child = spawn(
  command,
  argumentsForCommand,
  {
    cwd: projectRoot,
    env: environment,
    stdio: 'inherit',
  },
);

const cleanup = async () => {
  await rm(harnessConfigDirectory, { recursive: true, force: true });
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
