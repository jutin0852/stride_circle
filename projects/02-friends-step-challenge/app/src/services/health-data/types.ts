export type HealthDataSource = 'expo-pedometer' | 'health-connect' | 'healthkit';

export type HealthDataBackgroundMode = 'foreground-only' | 'health-connect-background-read' | 'healthkit-observer';

export type HealthDataPermissionStatus = 'granted' | 'denied' | 'not-determined' | 'unknown';

export type HealthDataPermission = {
  granted: boolean;
  status: HealthDataPermissionStatus;
};

export type HealthDataProvider = {
  canReadDailyTotals: boolean;
  backgroundMode: HealthDataBackgroundMode;
  source: HealthDataSource;
  getPermissionStatus: () => Promise<HealthDataPermission>;
  isAvailable: () => Promise<boolean>;
  getDailySteps: (input: { end: Date; start: Date }) => Promise<number>;
  requestPermission: () => Promise<{ granted: boolean }>;
  subscribeToStepUpdates: (onStepsChanged: () => void | Promise<void>) => { remove: () => void };
  openHealthSettings: () => Promise<void>;
};
