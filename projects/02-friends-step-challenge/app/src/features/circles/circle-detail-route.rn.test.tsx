import { fireEvent, render, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CircleDetailRoute from '@/app/circle/[circleId]';

const mockPush = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => ({ circleId: 'circle-1' }),
}));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'owner-1' } }) }));
jest.mock('@/components/leaderboard', () => ({ Leaderboard: () => null }));
jest.mock('@/hooks/use-circle-chat-unread-count', () => ({ useCircleChatUnreadCount: () => ({ moreMayBeUnread: false, unreadCount: 0 }) }));
jest.mock('@/hooks/use-blocked-people', () => ({ useBlockedPeople: () => ({ ids: new Set(), people: [], retry: jest.fn(), status: 'ready' }) }));
jest.mock('@/hooks/use-circle-details', () => ({
  useCircleDetails: () => ({
    details: {
      circle: { id: 'circle-1', memberCount: 2, name: 'Morning Walkers', ownerId: 'owner-1', competitionTimeZone: 'UTC', visibility: 'private' },
      members: [{ avatarSeed: 'walker', avatarStyle: 'adventurer', displayName: 'Jutin', role: 'owner', userId: 'owner-1' }],
    },
    status: 'ready',
  }),
}));
jest.mock('@/hooks/use-circle-period-steps', () => ({ useCirclePeriodSteps: () => ({ stepsByDate: {}, status: 'ready' }) }));

describe('circle standings header', () => {
  beforeEach(() => mockPush.mockClear());

  it('shows the plain circle name and opens circle options from the top-right control', async () => {
    const screen = await render(<SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}><CircleDetailRoute /></SafeAreaProvider>);
    const fixedHeader = screen.getByTestId('circle-fixed-header');

    expect(screen.queryByText('1 walker')).toBeNull();
    expect(screen.getByRole('link', { name: 'Activity' })).toBeTruthy();
    expect(within(fixedHeader).getByText('Morning Walkers').props.numberOfLines).toBe(2);
    expect(screen.queryByRole('link', { name: 'Open Morning Walkers circle details' })).toBeNull();
    expect(within(fixedHeader).getByRole('button', { name: 'Open circle options' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open circle chat' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open circle options' }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/circle/[circleId]/actions', params: { circleId: 'circle-1' } });
  });

  it('keeps the header fixed and the chat button floating outside the scrolling standings', async () => {
    const screen = await render(<SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}><CircleDetailRoute /></SafeAreaProvider>);
    const fixedHeader = screen.getByTestId('circle-fixed-header');
    const standingsScroll = screen.getByTestId('circle-standings-scroll');

    expect(within(fixedHeader).getByText('Morning Walkers')).toBeTruthy();
    expect(within(fixedHeader).getByRole('button', { name: 'Open circle options' })).toBeTruthy();
    expect(within(fixedHeader).getByRole('tab', { name: 'Today' })).toBeTruthy();
    expect(within(standingsScroll).getByText('Today’s standings')).toBeTruthy();
    expect(standingsScroll.props.showsVerticalScrollIndicator).toBe(false);
    expect(within(standingsScroll).queryByRole('button', { name: 'Open circle chat' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open circle chat' })).toBeTruthy();
  });
});
