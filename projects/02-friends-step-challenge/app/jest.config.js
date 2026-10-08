module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(rn.test|rn.spec).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/functions/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|panelui-native|uniwind|tailwind-variants|tailwind-merge|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
