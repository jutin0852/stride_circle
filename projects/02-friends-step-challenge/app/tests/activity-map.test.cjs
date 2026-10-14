const test = require('node:test');
const { harness, loadTS, assert } = require('./hook-harness.cjs');
const route = loadTS('src/lib/route.ts');
const walk = loadTS('src/domain/walk.ts', { '@/lib/route': route });

// Resolve the public wrapper and its native child in this lightweight probe.
// Stateful mount/unmount and theme behavior are covered by the RN component tests.
const renderElement = (type, props) => typeof type === 'function' ? type(props) : { type, props };
function findElement(element, predicate) {
  if (!element || typeof element !== 'object') return null;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat(Infinity)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function mapHarness(platform, token) {
  return harness('src/components/activity-map.native.tsx', 'ActivityMap', {
    'react/jsx-runtime': { jsx: renderElement, jsxs: renderElement },
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
    const map = findElement(result, element => element.type === 'NativeMap');
    assert.equal(map.type, 'NativeMap');
    assert.equal(findElement(map, element => element.props?.id === 'walk'), null);
    map.props.onDidFinishLoadingStyle();
    const loadedMap = h.render(props);
    const walked = findElement(loadedMap, element => element.props?.id === 'walk').props.shape;
    assert.equal(walked.features.length, 2);
    assert.equal(walked.features[1].geometry.coordinates[0][0], 3);
  }
});
