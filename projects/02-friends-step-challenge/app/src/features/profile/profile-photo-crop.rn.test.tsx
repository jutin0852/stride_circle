import { act, fireEvent, render } from '@testing-library/react-native';
import { ProfilePhotoCrop } from './profile-photo-crop';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const photo = { uri: 'file:///photo.jpg', width: 4000, height: 3000 };
function Wrapper({ children }: PropsWithChildren) {
  return <SafeAreaProvider initialMetrics={{ frame: { width: 390, height: 844, x: 0, y: 0 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } }}>{children}</SafeAreaProvider>;
}

it('waits for the image, allows zoom and position adjustment, and confirms only the crop', async () => {
  const confirm = jest.fn();
  const screen = await render(<ProfilePhotoCrop photo={photo} onCancel={jest.fn()} onConfirm={confirm} />, { wrapper: Wrapper });
  expect(screen.getByRole('button', { name: 'Use photo' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent(screen.getByTestId('profile-photo-crop-image'), 'load');
  await fireEvent.press(screen.getByRole('button', { name: 'Zoom in' }));
  // fireEvent gates this view through its touch responder, unlike native a11y actions.
  await act(() => screen.getByLabelText('Photo crop position').props.onAccessibilityAction({ nativeEvent: { actionName: 'right' } }));
  await fireEvent.press(screen.getByRole('button', { name: 'Use photo' }));
  expect(confirm).toHaveBeenCalledWith({ originX: 960, originY: 300, width: 2400, height: 2400 });
});

it('can cancel after a photo fails to load without confirming it', async () => {
  const confirm = jest.fn();
  const cancel = jest.fn();
  const screen = await render(<ProfilePhotoCrop photo={photo} onCancel={cancel} onConfirm={confirm} />, { wrapper: Wrapper });
  await fireEvent(screen.getByTestId('profile-photo-crop-image'), 'error');
  expect(screen.getByText(/could not be opened/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Use photo' }).props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
});
