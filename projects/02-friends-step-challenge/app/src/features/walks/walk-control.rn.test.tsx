import { Animated } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { WalkControl } from './walk-control';

let mockReducedMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReducedMotion }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

beforeEach(() => { mockReducedMotion = false; });
afterEach(() => { jest.restoreAllMocks(); });

it('gives spring press feedback without delaying the action', async () => {
  const spring = jest.spyOn(Animated, 'spring');
  const onPress = jest.fn();
  const screen = await render(<WalkControl label="Start a walk" icon="walk-outline" circular onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Start a walk' });
  await fireEvent(button, 'pressIn');
  expect(spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.96 }));
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
  await fireEvent(button, 'pressOut');
  expect(spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
});

it('updates Pause to Resume with a short content transition', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const onPress = jest.fn();
  const screen = await render(<WalkControl label="Pause walk" icon="pause" onPress={onPress} />);
  timing.mockClear();
  await screen.rerender(<WalkControl label="Resume walk" icon="play" onPress={onPress} />);
  expect(screen.getByRole('button', { name: 'Resume walk' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Pause walk' })).toBeNull();
  expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: 160, toValue: 1 }));
});

it('keeps loading controls disabled and reports their busy state', async () => {
  const onPress = jest.fn();
  const screen = await render(<WalkControl label="Start a walk" icon="walk-outline" circular loading onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Start a walk' });
  expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

it('does not animate presses or state changes when Reduce Motion is enabled', async () => {
  mockReducedMotion = true;
  const spring = jest.spyOn(Animated, 'spring');
  const timing = jest.spyOn(Animated, 'timing');
  const screen = await render(<WalkControl label="Pause walk" icon="pause" onPress={jest.fn()} />);
  await fireEvent(screen.getByRole('button', { name: 'Pause walk' }), 'pressIn');
  await screen.rerender(<WalkControl label="Resume walk" icon="play" onPress={jest.fn()} />);
  expect(spring).not.toHaveBeenCalled();
  expect(timing).not.toHaveBeenCalled();
});
