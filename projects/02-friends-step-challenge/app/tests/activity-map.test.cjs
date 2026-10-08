const test = require('node:test');
const { harness, loadTS, assert } = require('./hook-harness.cjs');
const route = loadTS('src/lib/route.ts');
const walk = loadTS('src/domain/walk.ts', { '@/lib/route': route });

function mapHarness(platform, token) {
  return harness('src/components/activity-map.native.tsx', 'ActivityMap', {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: s => s, absoluteFill: {} }, useColorScheme: () => 'light' },
    'expo-constants': { executionEnvironment: 'standalone' },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    '@/components/ui': { AppText: 'Text' },
    '@rnmapbox/maps': { default: { MapView: 'NativeMap', Camera: 'Camera', ShapeSource: 'Shape', LineLayer: 'Line', CircleLayer: 'Circle', setAccessToken() {}, setTelemetryEnabled() {} } },
    '@/lib/route': route, '@/domain/walk': walk,
    '@/services/maps/mapbox': { mapboxToken: () => token },
    '@/services/maps/style': { walkingMapStyle: () => '{}' },
    '@/design-system/use-app-theme': { useAppColors: () => ({ soft: '#eee', muted: '#555', accent: '#08f', card: '#fff' }) },
  }, platform);
}
test('missing token gracefully preserves recording on iOS and Android', () => {
  for (const platform of ['ios', 'android']) {
    const result = mapHarness(platform, null).render({ style: {}, route: [] });
    assert.equal(result.type, 'View');
    assert.match(result.props.children[0].props.children, /walk can still record and save/);
  }
});
test('Mapbox route geometry preserves pause boundaries on both native platforms', async () => {
  for (const platform of ['ios', 'android']) {
    const h = mapHarness(platform, 'pk.test');
    const props = { style: {}, route: [
      { latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3, segmentStart: true }, { latitude: 4, longitude: 4 },
    ] };
    h.render(props); await h.advance(0);
    const result = h.render(props);
    const map = result.props.children[0];
    assert.equal(map.type, 'NativeMap');
    const walked = map.props.children[2].props.shape;
    assert.equal(walked.features.length, 2);
    assert.equal(walked.features[1].geometry.coordinates[0][0], 3);
  }
});
