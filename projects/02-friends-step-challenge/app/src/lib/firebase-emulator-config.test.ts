import { describe, expect, it } from 'vitest';

import { getFirebaseEmulatorConfig } from './firebase-emulator-config';

const demoConfig = {
  development: true,
  enabled: 'true',
  host: '  10.0.2.2  ',
  projectId: 'demo-stride-circle',
};

describe('getFirebaseEmulatorConfig', () => {
  it('keeps emulators disabled unless explicitly enabled in development', () => {
    expect(getFirebaseEmulatorConfig({ ...demoConfig, enabled: undefined })).toBeNull();
    expect(getFirebaseEmulatorConfig({ ...demoConfig, development: false })).toBeNull();
  });

  it('requires a demo project and a plain emulator host when enabled', () => {
    expect(() => getFirebaseEmulatorConfig({ ...demoConfig, projectId: 'stride-circle-prod' })).toThrow('demo-*');
    expect(() => getFirebaseEmulatorConfig({ ...demoConfig, host: undefined })).toThrow('EMULATOR_HOST');
    expect(() => getFirebaseEmulatorConfig({ ...demoConfig, host: 'http://localhost' })).toThrow('hostname or IP');
  });

  it('trims and returns the explicit host and emulator ports', () => {
    expect(getFirebaseEmulatorConfig(demoConfig)).toEqual({
      authPort: 9099,
      firestorePort: 8080,
      host: '10.0.2.2',
    });
  });
});
