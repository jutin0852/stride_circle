import * as Linking from 'expo-linking';

import { createExpoPedometerProvider } from '@/services/health-data/expo-pedometer-provider';
import type { HealthDataProvider } from '@/services/health-data/types';

type HealthKitModule = typeof import('@appeeky/expo-healthkit');

const ANDROID_READ_STEPS_PERMISSION = 'android.permission.health.READ_STEPS';

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

function isAndroid() {
  return process.env.EXPO_OS === 'android';
}

export function shouldUsePedometerFallback(platform: string | undefined, providerSetting: string | undefined) {
  return platform === 'ios' && providerSetting?.trim().toLowerCase() === 'pedometer';
}

/**
 * The installed health module is the source of truth when it is available.
 * Expo Pedometer remains an iOS-only fallback for binaries that were built
 * without the native module. The active source is deliberately mutable so the
 * UI never labels fallback data as HealthKit or Health Connect data.
 */
export function createHealthDataProvider(): HealthDataProvider {
  const fallback = createExpoPedometerProvider();
  const nativeSource = isAndroid() ? 'health-connect' : 'healthkit';
  let activeProvider: HealthDataProvider | null = shouldUsePedometerFallback(
    process.env.EXPO_OS,
    process.env.EXPO_PUBLIC_HEALTH_DATA_PROVIDER,
  ) ? fallback : null;
  let readQueue: Promise<unknown> = Promise.resolve();

  async function getAvailableNativeModule() {
    if (!isNativePlatform() || activeProvider === fallback) return null;

    const healthKit = await loadHealthKitModule();
    if (!healthKit?.isAvailable()) {
      activeProvider = fallback;
      return null;
    }

    return healthKit;
  }

  function activateFallback() {
    activeProvider = fallback;
    return fallback;
  }

  function readDailySteps(input: { end: Date; start: Date }) {
    const nextRead = readQueue.then(async () => {
      const healthKit = await getAvailableNativeModule();
      if (!healthKit) return fallback.getDailySteps(input);

      const statistics = await healthKit.queryStatistics({
        from: input.start,
        options: healthKit.StatisticsOption.cumulativeSum,
        to: input.end,
        type: healthKit.QuantityType.stepCount,
        unit: healthKit.Unit.count,
      });
      return Math.max(0, Math.round(statistics.sum ?? 0));
    });

    // A failed read must not poison the queue for all future reads.
    readQueue = nextRead.catch(() => undefined);
    return nextRead;
  }

  const provider: HealthDataProvider = {
    get backgroundMode() {
      return activeProvider?.backgroundMode ?? (isAndroid() ? 'health-connect-background-read' : 'healthkit-observer');
    },
    get canReadDailyTotals() {
      return activeProvider?.canReadDailyTotals ?? isNativePlatform();
    },
    get source() {
      return activeProvider?.source ?? nativeSource;
    },
    async getPermissionStatus() {
      const healthKit = await getAvailableNativeModule();
      if (!healthKit) {
        const permission = await activateFallback().getPermissionStatus();
        return permission;
      }

      if (isAndroid()) {
        const grantedPermissions = await healthKit.getGrantedPermissions();
        const granted = grantedPermissions.includes(ANDROID_READ_STEPS_PERMISSION);
        if (granted) return { granted: true, status: 'granted' };

        const requestStatus = await healthKit.getRequestStatusForAuthorization({
          toRead: [healthKit.QuantityType.stepCount],
        });
        return {
          granted: false,
          status: requestStatus === healthKit.AuthorizationRequestStatus.shouldRequest ? 'not-determined' : 'denied',
        };
      }

      // HealthKit intentionally does not disclose read authorization. The
      // request status only tells us whether the system sheet may be needed;
      // it does not prove that step reads are allowed.
      const requestStatus = await healthKit.getRequestStatusForAuthorization({
        toRead: [healthKit.QuantityType.stepCount],
      });
      return {
        granted: false,
        status: requestStatus === healthKit.AuthorizationRequestStatus.shouldRequest ? 'not-determined' : 'unknown',
      };
    },
    async isAvailable() {
      const healthKit = await getAvailableNativeModule();
      if (healthKit) return true;
      return activateFallback().isAvailable();
    },
    getDailySteps(input) {
      return readDailySteps(input);
    },
    async requestPermission() {
      const healthKit = await getAvailableNativeModule();
      if (!healthKit) return activateFallback().requestPermission();

      const granted = await healthKit.requestAuthorization({
        includeBackgroundRead: true,
        toRead: [healthKit.QuantityType.stepCount],
      });
      return { granted };
    },
    subscribeToStepUpdates(onStepsChanged) {
      let removed = false;
      let subscription: { remove: () => void } | null = null;

      void getAvailableNativeModule().then(async (healthKit) => {
        if (removed) return;
        if (!healthKit) {
          subscription = activateFallback().subscribeToStepUpdates(onStepsChanged);
          return;
        }

        // Health Connect has no equivalent observer query in this package.
        // Active refreshes in useStepTracking are the Android update path.
        if (isAndroid()) return;

        try {
          await healthKit.observe([healthKit.QuantityType.stepCount]);
          await healthKit.enableBackgroundDelivery(
            healthKit.QuantityType.stepCount,
            healthKit.UpdateFrequency.hourly,
          );
          if (removed) return;

          // The returned promise is important: the native module holds the
          // iOS observer completion handler until the cumulative read settles.
          subscription = healthKit.addUpdateListener(async () => {
            await onStepsChanged();
          });
        } catch {
          // Foreground refreshes remain active even if observer registration is
          // unavailable in this particular development build.
          subscription = null;
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

  return provider;
}
