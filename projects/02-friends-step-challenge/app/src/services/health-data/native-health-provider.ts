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

// Steps typed into Apple Health are written by the Health app itself and
// tagged HKMetadataKeyWasUserEntered (serialized by the module as "1").
const APPLE_HEALTH_BUNDLE_ID = 'com.apple.Health';
const HEALTHKIT_USER_ENTERED_KEY = 'HKWasUserEntered';
// Health Connect Metadata.RECORDING_METHOD_MANUAL_ENTRY, exposed by our
// patch to @appeeky/expo-healthkit (patches/).
const HEALTH_CONNECT_RECORDING_METHOD_KEY = 'recordingMethod';
const HEALTH_CONNECT_MANUAL_ENTRY = '3';
// Android must read every step record to find manual ones, so that read is
// reused for a few minutes instead of repeating on each foreground refresh.
const ANDROID_HAND_ENTERED_CACHE_MS = 5 * 60_000;

export function isHandEnteredSample(sample: { metadata?: Record<string, string> }) {
  const healthKitFlag = sample.metadata?.[HEALTHKIT_USER_ENTERED_KEY]?.toLowerCase();
  return healthKitFlag === '1'
    || healthKitFlag === 'true'
    || sample.metadata?.[HEALTH_CONNECT_RECORDING_METHOD_KEY] === HEALTH_CONNECT_MANUAL_ENTRY;
}

export function sumHandEnteredSteps(samples: readonly { metadata?: Record<string, string>; value: number }[]) {
  return samples.reduce((total, sample) => isHandEnteredSample(sample) ? total + Math.max(0, sample.value) : total, 0);
}

export function shouldUsePedometerFallback(platform: string | undefined, providerSetting: string | undefined) {
  // iOS defaults to foreground pedometer for free-signed builds; HealthKit is
  // selected explicitly only in a build with the required entitlement.
  return platform === 'ios' && providerSetting?.trim().toLowerCase() !== 'healthkit';
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
  let androidHandEntered: { computedAt: number; start: number; steps: number } | null = null;

  async function readHandEnteredSteps(healthKit: HealthKitModule, input: { end: Date; start: Date }) {
    if (!isAndroid()) {
      // Only the Health app writes hand-entered samples, so this read stays small.
      return sumHandEnteredSteps(await healthKit.queryQuantitySamples({
        from: input.start,
        sources: [APPLE_HEALTH_BUNDLE_ID],
        to: input.end,
        type: healthKit.QuantityType.stepCount,
        unit: healthKit.Unit.count,
      }));
    }

    const start = input.start.getTime();
    const now = Date.now();
    if (androidHandEntered?.start === start && now - androidHandEntered.computedAt < ANDROID_HAND_ENTERED_CACHE_MS) {
      return androidHandEntered.steps;
    }

    // Health Connect cannot filter by recording method, so read the day's
    // step records and keep the manual ones.
    const steps = sumHandEnteredSteps(await healthKit.queryQuantitySamples({
      from: input.start,
      to: input.end,
      type: healthKit.QuantityType.stepCount,
      unit: healthKit.Unit.count,
    }));
    androidHandEntered = { computedAt: now, start, steps };
    return steps;
  }

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
      // The statistics sum stays de-duplicated across devices; subtract only
      // hand-entered samples so typed-in steps never count.
      const handEnteredSteps = await readHandEnteredSteps(healthKit, input);
      return Math.max(0, Math.round((statistics.sum ?? 0) - handEnteredSteps));
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
