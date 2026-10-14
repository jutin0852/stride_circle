import { Animated, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { Button } from './Button';
import { IconButton } from './IconButton';

let mockReducedMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReducedMotion }));
beforeEach(() => { mockReducedMotion = false; });
afterEach(() => { jest.restoreAllMocks(); });

it('animates button feedback while preserving caller events and immediate actions', async () => {
  const spring = jest.spyOn(Animated, 'spring');
  const onPress = jest.fn(); const onPressIn = jest.fn(); const onPressOut = jest.fn();
  const screen = await render(<Button onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>Save</Button>);
  const button = screen.getByRole('button', { name: 'Save' });
  await fireEvent(button, 'pressIn', {});
  expect(spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.97 }));
  expect(onPressIn).toHaveBeenCalledTimes(1);
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
  await fireEvent(button, 'pressOut', {});
  expect(spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
  expect(onPressOut).toHaveBeenCalledTimes(1);
});
it('keeps loading buttons disabled', async () => {
  const onPress = jest.fn();
  const screen = await render(<Button loading onPress={onPress}>Save</Button>);
  const button = screen.getByRole('button', { name: 'Save' });
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
  expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
});
it('respects Reduce Motion for shared buttons and icons', async () => {
  mockReducedMotion = true;
  const spring = jest.spyOn(Animated, 'spring');
  const screen = await render(<><Button>Save</Button><IconButton accessibilityLabel="Back"><Text>Back</Text></IconButton></>);
  await fireEvent(screen.getByRole('button', { name: 'Save' }), 'pressIn', {});
  await fireEvent(screen.getByRole('button', { name: 'Back' }), 'pressIn', {});
  expect(spring).not.toHaveBeenCalled();
});
it('gives enabled icons spring feedback', async () => {
  const spring = jest.spyOn(Animated, 'spring');
  const screen = await render(<IconButton accessibilityLabel="Back"><Text>Back</Text></IconButton>);
  await fireEvent(screen.getByRole('button', { name: 'Back' }), 'pressIn', {});
  expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0.97 }));
});
