import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

/** Keep reproducible native settings in config, never in generated Android files. */
export default function appConfig(): ExpoConfig {
  const base = appJson.expo as ExpoConfig;
  return {
    ...base,
    plugins: [...(base.plugins ?? []), ['@rnmapbox/maps', { RNMapboxMapsVersion: '11.23.1' }], 'expo-sharing', ['expo-notifications', { color: '#13B5E8', enableBackgroundRemoteNotifications: false }], './plugins/with-local-notifications'],
  };
}
