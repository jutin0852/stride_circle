const test = require('node:test');
const { harness, loadTS, assert } = require('./hook-harness.cjs');

function mapHarness(platform, configured) {
  return harness('src/components/activity-map.native.tsx', 'ActivityMap', {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: (styles) => styles }, useColorScheme: () => 'light' },
    'expo-constants': { expoConfig: { extra: { maps: { androidConfigured: configured } } } },
    'react-native-maps': { __esModule: true, default: 'NativeMap', Polyline: 'Polyline' },
    '@/lib/route': loadTS('src/lib/route.ts'),
    '@/design-system/use-app-theme': { useAppColors: () => ({ soft: '#eee', muted: '#555' }) },
  }, platform);
}

test('unconfigured Android map returns a fallback rather than mounting the native Google map', () => {
  const map = mapHarness('android', false).render({ style: {}, route: [] });
  assert.equal(map.type, 'View');
  assert.match(map.props.children.props.children, /Route recording works without it/);
});

test('configured Android and default iOS render separate route segments', () => {
  for (const platform of ['android', 'ios']) {
    const map = mapHarness(platform, platform === 'android').render({ style: {}, route: [
      { latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3, segmentStart: true }, { latitude: 4, longitude: 4 },
    ] });
    assert.equal(map.type, 'NativeMap');
    assert.equal(map.props.children.length, 2);
    assert.equal(map.props.children[0].props.coordinates.length, 2);
    assert.equal(map.props.children[1].props.coordinates[0].latitude, 3);
  }
});
