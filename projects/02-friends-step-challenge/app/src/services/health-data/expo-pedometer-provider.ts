import { Pedometer } from 'expo-sensors';
import * as Linking from 'expo-linking';

import type { HealthDataProvider } from '@/services/health-data/types';

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
  return {
    canReadDailyTotals: isIOS,
    source: 'expo-pedometer',
    async getPermissionStatus() {
      if (!isIOS) return { granted: false };
      return Pedometer.getPermissionsAsync();
    },
    async isAvailable() {
      if (!isIOS) return false;
      return Pedometer.isAvailableAsync();
    },
    async getDailySteps(input) {
      if (!isIOS) throw new Error('Health Connect is required for Android daily totals.');
      const result = await Pedometer.getStepCountAsync(input.start, input.end);
      return result.steps;
    },
    async requestPermission() {
      if (!isIOS) return { granted: false };
      return Pedometer.requestPermissionsAsync();
    },
    subscribeToStepUpdates(onStepsChanged) {
      if (!isIOS) return { remove: () => undefined };
      return Pedometer.watchStepCount(({ steps }) => onStepsChanged(steps));
    },
    async openHealthSettings() {
      await Linking.openURL('app-settings:');
    },
  };
}
