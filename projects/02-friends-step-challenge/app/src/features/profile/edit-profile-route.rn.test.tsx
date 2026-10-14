import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EditProfileRoute from '@/app/edit-profile';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { back: () => mockBack(), push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'walker-1' } }) }));
jest.mock('@/hooks/use-user-profile', () => ({ useUserProfile: () => ({ avatar: { seed: 'walker-1', style: 'sprouts' }, displayName: 'Walker One' }) }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
jest.mock('@/lib/auth', () => ({ updateUserDisplayName: (...args: unknown[]) => mockUpdate(...args), getAuthErrorMessage: () => 'Please try again.' }));
beforeEach(() => { jest.clearAllMocks(); mockUpdate.mockResolvedValue(undefined); });

async function show() {
  return render(<SafeAreaProvider initialMetrics={{ frame: { width: 390, height: 844, x: 0, y: 0 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } }}><EditProfileRoute /></SafeAreaProvider>);
}
it('gives the fixed heading sufficient line height and keeps form content below it', async () => {
  const screen = await show();
  const title = screen.getByRole('header', { name: 'Edit profile' });
  const typography = StyleSheet.flatten(title.props.style);
  expect(typography.fontSize).toBe(32);
  expect(typography.lineHeight).toBe(40);
  const body = within(screen.getByTestId('edit-profile-form'));
  expect(body.queryByText('Edit profile')).toBeNull();
  expect(body.getByText('Your character')).toBeTruthy();
  expect(body.getByLabelText('Display name')).toBeTruthy();
});
it('preserves editing, saving and character navigation', async () => {
  const screen = await show();
  await fireEvent.press(screen.getByRole('button', { name: /Choose a character/ }));
  expect(mockPush).toHaveBeenCalledWith('/profile-character');
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Updated Walker');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ displayName: 'Updated Walker', user: { uid: 'walker-1' } }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
});
