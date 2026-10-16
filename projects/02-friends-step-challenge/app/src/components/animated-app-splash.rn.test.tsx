import { act, fireEvent, render } from '@testing-library/react-native';

import { AnimatedAppSplash } from './animated-app-splash';

jest.mock('react-native-reanimated', () => {
  // Keeps the splash test deterministic without loading the native Worklets runtime in Jest.
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Easing: { linear: (value: unknown) => value, out: (value: unknown) => value, cubic: (value: unknown) => value },
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
  const screen = await render(<AnimatedAppSplash mode="full" onFinished={onFinished} reducedMotion />);

  expect(screen.getByLabelText('Wakà loading')).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(179); });
  expect(onFinished).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});

it('shows only the background while the mode is being decided', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash mode={null} onFinished={onFinished} reducedMotion={false} />);

  expect(screen.queryAllByTestId('shoe-print')).toHaveLength(0);
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(onFinished).not.toHaveBeenCalled();
});

it('waits for the real Reduce Motion setting before starting', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash mode="full" onFinished={onFinished} reducedMotion={null} />);

  expect(screen.queryAllByTestId('shoe-print')).toHaveLength(0);
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(onFinished).not.toHaveBeenCalled();

  await screen.rerender(<AnimatedAppSplash mode="full" onFinished={onFinished} reducedMotion={false} />);
  expect(screen.getAllByTestId('shoe-print')).toHaveLength(10);
});

it('plays the full run (eight trail prints and two runner shoes) in about two and a half seconds', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash mode="full" onFinished={onFinished} reducedMotion={false} />);

  expect(screen.getAllByTestId('shoe-print')).toHaveLength(10);
  await act(async () => { jest.advanceTimersByTime(2450 + 219); });
  expect(onFinished).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});

it('hands off in under a second on later launches', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  await render(<AnimatedAppSplash mode="short" onFinished={onFinished} reducedMotion={false} />);

  await act(async () => { jest.advanceTimersByTime(820); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});

it('skips the intro when tapped', async () => {
  jest.useFakeTimers();
  const onFinished = jest.fn();
  const screen = await render(<AnimatedAppSplash mode="full" onFinished={onFinished} reducedMotion={false} />);

  await act(async () => { jest.advanceTimersByTime(500); });
  await fireEvent.press(screen.getByLabelText('Wakà loading'));
  await act(async () => { jest.advanceTimersByTime(160); });
  expect(onFinished).toHaveBeenCalledTimes(1);

  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(onFinished).toHaveBeenCalledTimes(1);
});
