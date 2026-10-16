import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Keep reproducible native settings in config, never in generated Android files. */
export default function appConfig({ config }: ConfigContext): ExpoConfig {
  // Expo evaluates this config in Node, outside Metro's TypeScript resolver.
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const iosUrlScheme = iosClientId && /^\d+-[\w-]+\.apps\.googleusercontent\.com$/.test(iosClientId)
    ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
    : null;
  return {
    ...config,
    name: config.name ?? 'Wakà',
    slug: config.slug ?? 'stride-circle',
    plugins: [...(config.plugins ?? []), ['@rnmapbox/maps', { RNMapboxMapsVersion: '11.23.1' }], 'expo-sharing', ['expo-notifications', { color: '#13B5E8', enableBackgroundRemoteNotifications: false }], './plugins/with-local-notifications',
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, { iosUrlScheme: string }]] : []),
    ],
  };
}
