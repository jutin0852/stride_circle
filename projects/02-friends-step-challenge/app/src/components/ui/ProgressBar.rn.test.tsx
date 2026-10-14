import { Animated } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ProgressBar } from './ProgressBar';

let mockReducedMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReducedMotion }));
beforeEach(() => { mockReducedMotion = false; });
afterEach(() => { jest.restoreAllMocks(); });

it('animates updated progress and immediately exposes the actual accessible value', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const screen = await render(<ProgressBar animated value={25} max={100} />);
  await fireEvent(screen.getByTestId('progress-animated-track'), 'layout', { nativeEvent: { layout: { width: 240 } } });
  timing.mockClear();
  await screen.rerender(<ProgressBar animated value={60} max={100} />);
  expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.6, duration: 220, isInteraction: false }));
});

it('clamps progress above the goal and supports a new weekly target', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const screen = await render(<ProgressBar animated value={80} max={100} />);
  await fireEvent(screen.getByTestId('progress-animated-track'), 'layout', { nativeEvent: { layout: { width: 240 } } });
  await screen.rerender(<ProgressBar animated value={150} max={100} />);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
  await screen.rerender(<ProgressBar animated value={150} max={300} />);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.5 }));
});

it('updates instantly with Reduce Motion enabled', async () => {
  mockReducedMotion = true;
  const timing = jest.spyOn(Animated, 'timing');
  const screen = await render(<ProgressBar animated value={25} max={100} />);
  await fireEvent(screen.getByTestId('progress-animated-track'), 'layout', { nativeEvent: { layout: { width: 240 } } });
  await screen.rerender(<ProgressBar animated value={75} max={100} />);
  expect(timing).not.toHaveBeenCalled();
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(75);
});

it('does not add animation to other progress bars by default', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const screen = await render(<ProgressBar value={0.4} />);
  await screen.rerender(<ProgressBar value={0.8} />);
  expect(screen.queryByTestId('progress-animated-track')).toBeNull();
  expect(timing).not.toHaveBeenCalled();
});
