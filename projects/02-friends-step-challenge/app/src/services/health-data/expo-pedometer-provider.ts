import { Pedometer } from 'expo-sensors';
import * as Linking from 'expo-linking';

import type { HealthDataPermission, HealthDataProvider } from '@/services/health-data/types';

const isIOS = process.env.EXPO_OS === 'ios';

/**
 * Transitional provider for the current app binary.
 *
 * Pedometer is useful for the iOS prototype, but Expo documents that its
 * subscriptions do not deliver while the app is backgrounded. Android is
 * intentionally marked unavailable here until the Health Connect provider is
 * installed; a foreground session total must never be saved as a daily total.
 */
export function createExpoPedometerProvider(): HealthDataProvider {
  let readQueue: Promise<unknown> = Promise.resolve();

  function readDailySteps(input: { end: Date; start: Date }) {
    const nextRead = readQueue.then(async () => {
      if (!isIOS) throw new Error('Health Connect is required for Android daily totals.');
      const result = await Pedometer.getStepCountAsync(input.start, input.end);
      return result.steps;
    });

    readQueue = nextRead.catch(() => undefined);
    return nextRead;
  }

  return {
    backgroundMode: 'foreground-only',
    canReadDailyTotals: isIOS,
    source: 'expo-pedometer',
    async getPermissionStatus() {
      if (!isIOS) return { granted: false, status: 'denied' } satisfies HealthDataPermission;
      const permission = await Pedometer.getPermissionsAsync();
      return {
        granted: permission.granted,
        status: permission.granted ? 'granted' : permission.canAskAgain ? 'not-determined' : 'denied',
      } satisfies HealthDataPermission;
    },
    async isAvailable() {
      if (!isIOS) return false;
      return Pedometer.isAvailableAsync();
    },
    async getDailySteps(input) {
      return readDailySteps(input);
    },
    async requestPermission() {
      if (!isIOS) return { granted: false };
      return Pedometer.requestPermissionsAsync();
    },
    subscribeToStepUpdates(onStepsChanged) {
      if (!isIOS) return { remove: () => undefined };
      return Pedometer.watchStepCount(() => { void onStepsChanged(); });
    },
    async openHealthSettings() {
      await Linking.openURL('app-settings:');
    },
  };
}
