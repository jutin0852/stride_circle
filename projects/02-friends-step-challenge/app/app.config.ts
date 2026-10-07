import type { ExpoConfig } from 'expo/config';
import appJson from './app.json';

/** Keep reproducible native settings in config, never in generated Android files. */
export default function appConfig(): ExpoConfig {
  const base = appJson.expo as ExpoConfig;
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();
  return {
    ...base,
    plugins: [...(base.plugins ?? []), ...(mapsKey ? [['react-native-maps', { androidGoogleMapsApiKey: mapsKey }] as [string, object]] : [])],
    // The UI consumes a capability flag. Restrict the native SDK key to this app/signing certificate.
    extra: { ...base.extra, maps: { androidConfigured: Boolean(mapsKey) } },
  };
}
