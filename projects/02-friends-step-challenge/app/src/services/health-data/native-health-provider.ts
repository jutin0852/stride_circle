import * as Linking from 'expo-linking';

import { createExpoPedometerProvider } from '@/services/health-data/expo-pedometer-provider';
import type { HealthDataProvider } from '@/services/health-data/types';

type HealthKitModule = typeof import('@appeeky/expo-healthkit');

let healthKitModulePromise: Promise<HealthKitModule | null> | null = null;

function loadHealthKitModule() {
  if (!healthKitModulePromise) {
    healthKitModulePromise = import('@appeeky/expo-healthkit').catch(() => null);
  }
  return healthKitModulePromise;
}

function isNativePlatform() {
  return process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android';
}

export function createHealthDataProvider(): HealthDataProvider {
  const fallback = createExpoPedometerProvider();
  const nativeSource = process.env.EXPO_OS === 'android' ? 'health-connect' : 'healthkit';

  return {
    canReadDailyTotals: isNativePlatform(),
    source: nativeSource,
    async getPermissionStatus() {
      const healthKit = await loadHealthKitModule();
      if (!healthKit?.isAvailable()) return fallback.getPermissionStatus();

      const requestStatus = await healthKit.getRequestStatusForAuthorization({
        toRead: [healthKit.QuantityType.stepCount],
      });
      return { granted: requestStatus === healthKit.AuthorizationRequestStatus.unnecessary };
    },
    async isAvailable() {
      const healthKit = await loadHealthKitModule();
      if (healthKit?.isAvailable()) return true;
      return fallback.isAvailable();
    },
    async getDailySteps(input) {
      const healthKit = await loadHealthKitModule();
      if (!healthKit?.isAvailable()) return fallback.getDailySteps(input);

      const statistics = await healthKit.queryStatistics({
        from: input.start,
        options: healthKit.StatisticsOption.cumulativeSum,
        to: input.end,
        type: healthKit.QuantityType.stepCount,
        unit: healthKit.Unit.count,
      });
      return Math.max(0, Math.round(statistics.sum ?? 0));
    },
    async requestPermission() {
      const healthKit = await loadHealthKitModule();
      if (!healthKit?.isAvailable()) return fallback.requestPermission();

      const granted = await healthKit.requestAuthorization({
        includeBackgroundRead: true,
        toRead: [healthKit.QuantityType.stepCount],
      });
      return { granted };
    },
    subscribeToStepUpdates(onStepsChanged) {
      let removed = false;
      let subscription: { remove: () => void } | null = null;

      void loadHealthKitModule().then(async (healthKit) => {
        if (removed) return;
        if (!healthKit?.isAvailable()) {
          subscription = fallback.subscribeToStepUpdates(onStepsChanged);
          return;
        }

        try {
          await healthKit.observe([healthKit.QuantityType.stepCount]);
          if (removed) return;
          subscription = healthKit.addUpdateListener(() => onStepsChanged(0));
        } catch {
          subscription = { remove: () => undefined };
        }
      });

      return {
        remove: () => {
          removed = true;
          subscription?.remove();
        },
      };
    },
    async openHealthSettings() {
      await Linking.openURL('app-settings:');
    },
  };
}
