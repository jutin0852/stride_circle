import { act, render } from '@testing-library/react-native';

import { AnimatedAppSplash } from './animated-app-splash';

jest.mock('react-native-reanimated', () => {
  // Keeps the splash test deterministic without loading the native Worklets runtime in Jest.
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Easing: { linear: (value: unknown) => value },
    default: { View, createAnimatedComponent: (component: unknown) => component },
    createAnimatedComponent: (component: unknown) => component,
    useAnimatedProps: (factory: () => unknown) => factory(),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native');
  const Passthrough = ({ children }: { children?: unknown }) => <View>{children as never}</View>;
  return { __esModule: true, default: Passthrough, G: Passthrough, Path: () => <View testID="shoe-print" /> };
});

afterEach(() => { jest.useRealTimers(); });

it('hands off quickly when Reduce Motion is enabled', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash onFinished={onFinished} reducedMotion />);

  expect(screen.getByLabelText('Waka loading')).toBeTruthy();
  expect(onFinished).not.toHaveBeenCalled();

  await act(async () => { jest.advanceTimersByTime(180); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});

it('draws the trail and both runner shoes, then finishes after the run and exit fade', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash onFinished={onFinished} reducedMotion={false} />);

  expect(screen.getAllByTestId('shoe-print')).toHaveLength(10);

  await act(async () => { jest.advanceTimersByTime(3200); });
  expect(onFinished).not.toHaveBeenCalled();

  await act(async () => { jest.advanceTimersByTime(260); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});
