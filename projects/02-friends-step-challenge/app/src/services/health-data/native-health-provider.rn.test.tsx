import { shouldUsePedometerFallback, sumHandEnteredSteps } from './native-health-provider';

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));
jest.mock('@/services/health-data/expo-pedometer-provider', () => ({
  createExpoPedometerProvider: () => ({
    backgroundMode: 'foreground-only',
    canReadDailyTotals: true,
    getDailySteps: jest.fn(),
    getPermissionStatus: jest.fn(),
    isAvailable: jest.fn(),
    openHealthSettings: jest.fn(),
    requestPermission: jest.fn(),
    source: 'expo-pedometer',
    subscribeToStepUpdates: jest.fn(),
  }),
}));

describe('health provider development override', () => {
  it('uses the foreground Pedometer by default on iOS free-signed builds', () => {
    expect(shouldUsePedometerFallback('ios', undefined)).toBe(true);
  });

  it('uses the foreground Pedometer when explicitly selected on iOS', () => {
    expect(shouldUsePedometerFallback('ios', 'pedometer')).toBe(true);
  });

  it('uses HealthKit on iOS only when explicitly requested', () => {
    expect(shouldUsePedometerFallback('ios', 'healthkit')).toBe(false);
  });

  it('does not let the iOS override disable Android Health Connect', () => {
    expect(shouldUsePedometerFallback('android', 'pedometer')).toBe(false);
  });

  it('does not select a native step provider for web', () => {
    expect(shouldUsePedometerFallback('web', undefined)).toBe(false);
  });
});

describe('hand-entered steps', () => {
  it('totals only HealthKit samples flagged as user entered', () => {
    expect(sumHandEnteredSteps([
      { metadata: { HKWasUserEntered: '1' }, value: 20000 },
      { metadata: { HKWasUserEntered: 'true' }, value: 500 },
      { metadata: { HKWasUserEntered: '0' }, value: 900 },
      { metadata: { HKDeviceName: 'iPhone' }, value: 1200 },
      { value: 300 },
    ])).toBe(20500);
  });

  it('totals only Health Connect records with the manual-entry recording method', () => {
    expect(sumHandEnteredSteps([
      { metadata: { recordingMethod: '3' }, value: 15000 },
      { metadata: { recordingMethod: '2' }, value: 4000 },
      { metadata: { recordingMethod: '1' }, value: 2500 },
      { metadata: { recordingMethod: '0' }, value: 700 },
    ])).toBe(15000);
  });

  it('ignores negative values', () => {
    expect(sumHandEnteredSteps([{ metadata: { HKWasUserEntered: '1' }, value: -50 }])).toBe(0);
  });
});
