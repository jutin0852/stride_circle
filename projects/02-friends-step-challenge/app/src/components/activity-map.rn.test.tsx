/* eslint-disable @typescript-eslint/no-require-imports -- Jest factories resolve mocked dependencies lazily. */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { ActivityMap } from './activity-map.native';

const mockSetCamera = jest.fn();
const mockFitBounds = jest.fn();
const mockColors = { accent: '#13B5E8', card: '#fff', muted: '#555', soft: '#eee' };

jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'bare' } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/ui', () => ({ AppText: require('react-native').Text }));
jest.mock('@/design-system/use-app-theme', () => ({ useAppColors: () => mockColors }));
jest.mock('@/services/maps/mapbox', () => ({ mapboxToken: () => 'test-token' }));
jest.mock('@/services/maps/style', () => ({ walkingMapStyle: (_colors: unknown, dark: boolean) => dark ? 'dark-style' : 'light-style' }));
jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, default: {
    setAccessToken: jest.fn(async () => {}), setTelemetryEnabled: jest.fn(async () => {}),
    MapView: (props: object) => <View {...props} testID="map" />,
    Camera: React.forwardRef(function MockCamera(_props: unknown, ref: unknown) {
      React.useImperativeHandle(ref, () => ({ setCamera: mockSetCamera, fitBounds: mockFitBounds }));
      return null;
    }),
    ShapeSource: ({ id, ...props }: { id: string }) => <View {...props} testID={`source-${id}`} />,
    CircleLayer: ({ id, ...props }: { id: string }) => <View {...props} testID={`layer-${id}`} />,
    LineLayer: ({ id, ...props }: { id: string }) => <View {...props} testID={`layer-${id}`} />,
  } };
});

const point = { latitude: 6.45, longitude: 3.39 };
const props = { route: [point, { latitude: 6.46, longitude: 3.4 }], currentLocation: point, waypoints: [point], style: { height: 300 } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
});
afterEach(() => jest.restoreAllMocks());

async function setup() {
  const screen = await render(<ActivityMap {...props} />);
  await waitFor(() => expect(screen.getByTestId('map')).toBeTruthy());
  return screen;
}

it('waits for the style before mounting custom layers or moving the camera', async () => {
  const screen = await setup();
  expect(screen.queryByTestId('layer-position-dot')).toBeNull();
  expect(screen.queryByTestId('layer-walk-line')).toBeNull();
  expect(mockSetCamera).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  for (const id of ['position-dot', 'waypoint-dots', 'endpoint-dots', 'walk-line', 'planned-line']) {
    expect(screen.getByTestId(`layer-${id}`)).toBeTruthy();
  }
  expect(mockSetCamera).toHaveBeenCalled();
});

it('updates GPS geometry without changing layer appearance or reloading the base style', async () => {
  const screen = await setup();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  const appearance = screen.getByTestId('layer-position-dot').props.style;
  const mapStyle = screen.getByTestId('map').props.styleJSON;
  const nextPoint = { latitude: 6.47, longitude: 3.41 };
  await screen.rerender(<ActivityMap {...props} currentLocation={nextPoint} />);
  expect(screen.getByTestId('source-position').props.shape.geometry.coordinates).toEqual([3.41, 6.47]);
  expect(screen.getByTestId('layer-position-dot').props.style).toBe(appearance);
  expect(screen.getByTestId('map').props.styleJSON).toBe(mapStyle);
});

it('removes custom layers during a style reload and restores them after it completes', async () => {
  const screen = await setup();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  await fireEvent(screen.getByTestId('map'), 'willStartLoadingMap');
  expect(screen.queryByTestId('layer-position-dot')).toBeNull();
  await screen.rerender(<ActivityMap {...props} currentLocation={{ latitude: 6.47, longitude: 3.41 }} />);
  expect(screen.queryByTestId('source-position')).toBeNull();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  expect(screen.getByTestId('source-position').props.shape.geometry.coordinates).toEqual([3.41, 6.47]);
});

it('starts a new style lifecycle when the theme changes', async () => {
  const screen = await setup();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
  await screen.rerender(<ActivityMap {...props} route={[...props.route]} />);
  await waitFor(() => expect(screen.getByTestId('map').props.styleJSON).toBe('dark-style'));
  expect(screen.queryByTestId('layer-position-dot')).toBeNull();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  expect(screen.getByTestId('layer-position-dot')).toBeTruthy();
});

it('keeps retry maps empty until the new style loads', async () => {
  const screen = await setup();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  await fireEvent(screen.getByTestId('map'), 'mapLoadingError');
  expect(screen.queryByTestId('map')).toBeNull();
  await act(async () => { await fireEvent.press(screen.getByRole('button', { name: 'Retry map' })); });
  await waitFor(() => expect(screen.getByTestId('map')).toBeTruthy());
  expect(screen.queryByTestId('layer-position-dot')).toBeNull();
  await fireEvent(screen.getByTestId('map'), 'didFinishLoadingStyle');
  expect(screen.getByTestId('layer-position-dot')).toBeTruthy();
});
