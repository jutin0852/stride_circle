const isDevelopment = process.env.APP_VARIANT === 'development';

module.exports = ({ config }) => {
  const basePlugins = Array.isArray(config.plugins) ? config.plugins : [];
  const hasDevClientPlugin = basePlugins.some((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name === 'expo-dev-client';
  });

  const plugins = isDevelopment && !hasDevClientPlugin
    ? [
        ...basePlugins,
        [
          'expo-dev-client',
          {
            addGeneratedScheme: true,
          },
        ],
      ]
    : basePlugins;

  return {
    ...config,
    name: isDevelopment ? 'Walk Dev' : config.name,
    scheme: isDevelopment ? 'stride-circle-dev' : config.scheme,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier: isDevelopment
        ? 'com.stridecircle.app.dev'
        : config.ios?.bundleIdentifier,
    },
    android: isDevelopment
      ? {
          ...config.android,
          package: 'com.stridecircle.app.dev',
        }
      : config.android,
  };
};
