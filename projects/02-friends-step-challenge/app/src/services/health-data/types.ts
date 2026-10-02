export type HealthDataSource = 'expo-pedometer' | 'health-connect' | 'healthkit';

export type HealthDataProvider = {
  canReadDailyTotals: boolean;
  source: HealthDataSource;
  getPermissionStatus: () => Promise<{ granted: boolean }>;
  isAvailable: () => Promise<boolean>;
  getDailySteps: (input: { end: Date; start: Date }) => Promise<number>;
  requestPermission: () => Promise<{ granted: boolean }>;
  subscribeToStepUpdates: (onStepsChanged: (steps: number) => void) => { remove: () => void };
  openHealthSettings: () => Promise<void>;
};
