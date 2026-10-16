import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileCharacterRoute from '@/app/profile-character';

const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const mockUpdate = jest.fn();
let mockParams: { returnTo?: string } = {};
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args), back: () => mockBack() } }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'walker-1' } }) }));
jest.mock('@/hooks/use-user-profile', () => ({ useUserProfile: () => ({ avatar: { seed: 'walker-1', style: 'sprouts' }, displayName: 'Walker One' }) }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
jest.mock('@/lib/auth', () => ({ updateUserAvatar: (...args: unknown[]) => mockUpdate(...args), getAuthErrorMessage: () => 'Please try again.' }));
beforeEach(() => { jest.clearAllMocks(); mockParams = {}; mockUpdate.mockResolvedValue(undefined); });
async function show() {
  return render(<SafeAreaProvider initialMetrics={{ frame: { width: 390, height: 844, x: 0, y: 0 }, insets: { top: 59, bottom: 34, left: 0, right: 0 } }}><ProfileCharacterRoute /></SafeAreaProvider>);
}
it('returns a draft character to Edit Profile without changing the saved profile', async () => {
  mockParams = { returnTo: 'edit-profile' };
  const screen = await show();
  await fireEvent.press(screen.getAllByRole('button', { name: 'Choose character' })[0]);
  expect(mockDismissTo).toHaveBeenCalledWith({ pathname: '/edit-profile', params: { characterStyle: 'cameo' } });
  expect(mockUpdate).not.toHaveBeenCalled();
});
it('preserves the standalone picker save behavior', async () => {
  const screen = await show();
  await fireEvent.press(screen.getAllByRole('button', { name: 'Choose character' })[0]);
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ user: { uid: 'walker-1' }, avatar: { seed: 'walker-1', style: 'cameo' } }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
});
