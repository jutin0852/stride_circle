import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ProfileRoute from '@/app/(tabs)/profile';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockSetVisibility = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'walker-1' } }) }));
jest.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: () => ({
    avatar: { seed: 'walker-1', style: 'adventurer' },
    displayName: 'Walker One',
    globalLeaderboardVisible: false,
    status: 'ready',
  }),
}));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
// The development-only replay action imports Firestore through this module.
jest.mock('@/lib/onboarding', () => ({ restartOnboardingForTesting: jest.fn(() => Promise.resolve()) }));
jest.mock('@/lib/global-leaderboard', () => ({
  setGlobalLeaderboardVisibility: (...args: unknown[]) => mockSetVisibility(...args),
}));
jest.mock('@/lib/auth', () => ({
  getAuthErrorMessage: () => 'Please try again.',
  signOutCurrentUser: (...args: unknown[]) => mockSignOut(...args),
}));

async function renderProfile() {
  return await render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}>
      <ProfileRoute />
    </SafeAreaProvider>,
  );
}

describe('profile route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSignOut.mockReset().mockResolvedValue(undefined);
    mockSetVisibility.mockReset().mockResolvedValue(undefined);
  });

  it('shows the signed-in profile and routes to profile, reminder, and block settings', async () => {
    const screen = await renderProfile();

    expect(screen.getByTestId('profile-fixed-header')).toBeTruthy();
    expect(screen.getAllByText('Walker One')).toHaveLength(2);

    await fireEvent.press(screen.getByText('Tap to edit your profile'));
    await fireEvent.press(screen.getByRole('button', { name: 'Walking reminders' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Blocked people' }));

    expect(mockPush.mock.calls).toEqual([['/edit-profile'], ['/walking-reminders'], ['/blocked-people']]);
  });

  it('keeps the global leaderboard off until the walker opts in', async () => {
    const screen = await renderProfile();
    const toggle = screen.getByLabelText('Show me on the global leaderboard');

    expect(toggle.props.value).toBe(false);
    await fireEvent(toggle, 'valueChange', true);

    expect(mockSetVisibility).toHaveBeenCalledWith({ userId: 'walker-1', visible: true });
  });

  it('signs out through the shared auth service', async () => {
    const screen = await renderProfile();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
