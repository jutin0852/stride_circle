import { Animated } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';

import { AnimatedTabBar } from './animated-tab-bar';

jest.mock('expo-router/js-tabs', () => ({ BottomTabBar: jest.fn(() => null) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
let mockReducedMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReducedMotion }));

const routes = ['index', 'circle', 'activity', 'history', 'profile'].map(name => ({ name, key: name }));
function tabProps(index: number) {
  return {
    state: { index, routes },
    descriptors: {},
    navigation: { navigate: jest.fn(), emit: jest.fn() },
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
}

afterEach(() => { mockReducedMotion = false; jest.restoreAllMocks(); jest.clearAllMocks(); });

it('keeps Expo Router in charge of tab navigation and moves the highlight to the active tab', async () => {
  const spring = jest.spyOn(Animated, 'spring').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const initial = tabProps(0);
  const screen = await render(<AnimatedTabBar {...initial} />);
  expect(jest.mocked(BottomTabBar).mock.calls[0][0].navigation).toBe(initial.navigation);
  await fireEvent(screen.getByTestId('app-bottom-navigation'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 92 } } });
  expect(spring).not.toHaveBeenCalled();
  await screen.rerender(<AnimatedTabBar {...initial} state={{ ...initial.state, index: 4 }} />);
  expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 312 }));
});

it('aligns immediately after resizing or enabling Reduce Motion', async () => {
  const spring = jest.spyOn(Animated, 'spring').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  const initial = tabProps(4);
  const screen = await render(<AnimatedTabBar {...initial} />);
  await fireEvent(screen.getByTestId('app-bottom-navigation'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 92 } } });
  await fireEvent(screen.getByTestId('app-bottom-navigation'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 540, height: 92 } } });
  expect(spring).not.toHaveBeenCalled();
  mockReducedMotion = true;
  await screen.rerender(<AnimatedTabBar {...initial} state={{ ...initial.state, index: 1 }} />);
  expect(spring).not.toHaveBeenCalled();
});
