import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PeopleRoute from '@/app/people';

const mockSendInvite = jest.fn();
const mockSendFriendRequest = jest.fn();
let mockParams: { circleId?: string } = {};
let mockRole: 'member' | 'owner' = 'owner';

const mockGrace = { avatarSeed: 'g', avatarStyle: 'sprouts', discoverable: true, displayName: 'Grace Hopper', userId: 'grace', username: 'grace.h', usernameChangedAt: null };
const mockAda = { ...mockGrace, displayName: 'Ada L', userId: 'ada', username: 'ada.l' };

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => mockParams }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { displayName: 'Me', uid: 'me' } }) }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
jest.mock('@/hooks/use-blocked-people', () => ({ useBlockedPeople: () => ({ ids: new Set<string>(), people: [], retry: jest.fn(), status: 'ready' }) }));
jest.mock('@/hooks/use-circle-details', () => ({
  useCircleDetails: () => ({
    details: {
      circle: { id: 'CIRCLE01', name: 'Morning Walkers' },
      members: [{ role: mockRole, userId: 'me' }, { role: 'member', userId: 'ada' }],
    },
    status: 'ready',
  }),
}));
jest.mock('@/hooks/use-people', () => ({
  useFriends: () => ({ friendIds: [], friends: [], incoming: [], outgoing: [], status: 'ready' }),
  usePublicProfile: () => ({ status: 'ready', value: { username: 'me.walks' } }),
}));
jest.mock('@/features/people/use-people-search', () => ({
  usePeopleSearch: ({ term }: { term: string }) => (term.length >= 2 ? { results: [mockGrace, mockAda], status: 'ready', term } : { results: [], status: 'idle', term: '' }),
}));
jest.mock('@/lib/people', () => ({
  acceptFriendRequest: jest.fn(),
  deleteCircleInvite: jest.fn(),
  deleteFriendRequest: jest.fn(),
  getPeopleErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.'),
  getPublicProfile: jest.fn(() => Promise.resolve(null)),
  removeFriend: jest.fn(),
  sendCircleInvite: (...args: unknown[]) => mockSendInvite(...args),
  sendFriendRequest: (...args: unknown[]) => mockSendFriendRequest(...args),
  watchCircleInvites: (_id: string, onChange: (invites: unknown[]) => void) => { onChange([]); return () => undefined; },
}));

async function renderPeople() {
  return await render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}>
      <PeopleRoute />
    </SafeAreaProvider>,
  );
}

describe('Find people route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockRole = 'owner';
    mockSendFriendRequest.mockResolvedValue('sent');
    mockSendInvite.mockResolvedValue(undefined);
  });

  it('shows names and handles only, and sends a friend request', async () => {
    const screen = await renderPeople();
    await fireEvent.changeText(screen.getByLabelText('Search people'), 'gr');

    expect(screen.getByText('Grace Hopper')).toBeTruthy();
    expect(screen.getByText('@grace.h')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Add friend' })[0]);

    await waitFor(() => expect(mockSendFriendRequest).toHaveBeenCalledWith({ toId: 'grace', user: { displayName: 'Me', uid: 'me' } }));
    expect(await screen.findByText('Friend request sent to @grace.h.')).toBeTruthy();
  });

  it('invites to a circle for owners, marking people already in it', async () => {
    mockParams = { circleId: 'CIRCLE01' };
    const screen = await renderPeople();
    await fireEvent.changeText(screen.getByLabelText('Search people'), 'gr');

    expect(screen.getByText('In circle')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Invite' }));

    await waitFor(() => expect(mockSendInvite).toHaveBeenCalledWith({
      circleId: 'CIRCLE01', circleName: 'Morning Walkers', inviteeId: 'grace', inviter: { displayName: 'Me', uid: 'me' },
    }));
    expect(await screen.findByText('Invitation sent to @grace.h. They choose whether to join.')).toBeTruthy();
  });

  it('tells plain members they cannot invite', async () => {
    mockParams = { circleId: 'CIRCLE01' };
    mockRole = 'member';
    const screen = await renderPeople();

    expect(screen.getByText('Invitations are limited')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Search people'), 'gr');
    expect(screen.getByRole('button', { name: 'Invite', disabled: true })).toBeTruthy();
  });
});
