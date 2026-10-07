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
  it('uses the Expo Pedometer on iOS when explicitly selected', () => {
    expect(shouldUsePedometerFallback('ios', 'pedometer')).toBe(true);
  });

  it('does not let the iOS override disable Android Health Connect', () => {
    expect(shouldUsePedometerFallback('android', 'pedometer')).toBe(false);
  });
});
