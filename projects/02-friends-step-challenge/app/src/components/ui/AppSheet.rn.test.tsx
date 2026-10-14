import { Animated, PanResponder, Text, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppSheet } from './AppSheet';

jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));

describe('AppSheet', () => {
  it('can close and reopen repeatedly', async () => {
    const onClose = jest.fn();
    const sheet = (visible: boolean) => <AppSheet visible={visible} onClose={onClose}><Text>Circle form</Text></AppSheet>;
    const screen = await render(sheet(true));
    await fireEvent.press(screen.getByRole('button', { name: 'Close sheet', includeHiddenElements: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await screen.rerender(sheet(false));
    await waitFor(() => expect(screen.queryByText('Circle form')).toBeNull());
    await screen.rerender(sheet(true));
    expect(screen.getByText('Circle form')).toBeTruthy();
    await screen.rerender(sheet(false));
    await waitFor(() => expect(screen.queryByText('Circle form')).toBeNull());
  });

  it('does not dismiss from the backdrop while a request is pending', async () => {
    const onClose = jest.fn();
    const screen = await render(<AppSheet visible dismissible={false} swipeToDismiss onClose={onClose}><Text>Saving circle</Text></AppSheet>);
    await fireEvent.press(screen.getByRole('button', { name: 'Close sheet', includeHiddenElements: true }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Saving circle')).toBeTruthy();
  });

  it('dismisses a deliberate handle drag but springs back a small drag', async () => {
    const create = jest.spyOn(PanResponder, 'create');
    const spring = jest.spyOn(Animated, 'spring');
    const onClose = jest.fn();
    const screen = await render(<AppSheet visible swipeToDismiss onClose={onClose}><Text>Circle form</Text></AppSheet>);
    expect(screen.getByTestId('sheet-drag-handle', { includeHiddenElements: true })).toBeTruthy();
    const handlers = create.mock.calls[create.mock.calls.length - 1][0];
    const event = {} as GestureResponderEvent;
    const drag = (dy: number) => ({ dy, dx: 0, vy: 0, numberActiveTouches: 1 } as PanResponderGestureState);
    expect(handlers.onMoveShouldSetPanResponder?.(event, drag(5))).toBe(false);
    expect(handlers.onMoveShouldSetPanResponder?.(event, drag(140))).toBe(true);
    await act(async () => { handlers.onPanResponderRelease?.(event, drag(20)); });
    expect(onClose).not.toHaveBeenCalled();
    // Reduce Motion snaps the handle back instead of animating it.
    expect(spring).not.toHaveBeenCalled();
    await act(async () => { handlers.onPanResponderRelease?.(event, drag(140)); });
    expect(onClose).toHaveBeenCalledTimes(1);
    spring.mockRestore();
    create.mockRestore();
  });
});
