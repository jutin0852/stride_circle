import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const toolsDirectory = join(projectRoot, '.tools');
const portableJdk = existsSync(toolsDirectory)
  ? readdirSync(toolsDirectory, { withFileTypes: true }).find(
      (entry) => entry.isDirectory() && entry.name.startsWith('jdk-21'),
    )
  : undefined;

const environment = { ...process.env };

if (portableJdk) {
  environment.JAVA_HOME = join(toolsDirectory, portableJdk.name);
  environment.PATH = `${join(environment.JAVA_HOME, 'bin')}${process.platform === 'win32' ? ';' : ':'}${environment.PATH ?? ''}`;
} else {
  console.warn('No portable JDK 21 was found in .tools; using the system Java installation.');
}

const npxBinary = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const command = process.platform === 'win32' ? npxBinary : npxBinary;
const argumentsForCommand = [
  'firebase',
  'emulators:exec',
  '--project',
  'demo-stride-circle',
  '--only',
  'auth,firestore',
  '"npm run test:rules"',
];

const child = spawn(
  command,
  argumentsForCommand,
  {
    cwd: projectRoot,
    env: environment,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exitCode = code ?? 1;
  }
});
