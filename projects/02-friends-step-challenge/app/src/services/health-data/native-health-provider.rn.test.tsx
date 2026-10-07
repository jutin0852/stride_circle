import { shouldUsePedometerFallback } from './native-health-provider';

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
