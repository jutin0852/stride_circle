import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { PeopleShortcuts } from '@/features/people/people-shortcuts';
import { UsernameForm } from '@/features/people/username-form';

const mockPush = jest.fn();
const mockClaim = jest.fn();
const mockChange = jest.fn();
const mockSetDiscoverable = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();
let mockInvites: { circleId: string; circleName: string; id: string; inviterDisplayName: string }[] = [];

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'me', displayName: 'Ada Lovelace' } }) }));
jest.mock('@/hooks/use-people', () => ({
  useCircleInvites: () => ({ status: 'ready', value: mockInvites }),
  useFriends: () => ({ incoming: [{ id: 'x_me' }, { id: 'y_me' }], status: 'ready' }),
}));
jest.mock('@/lib/people', () => ({
  acceptCircleInvite: (...args: unknown[]) => mockAccept(...args),
  changeUsername: (...args: unknown[]) => mockChange(...args),
  claimUsername: (...args: unknown[]) => mockClaim(...args),
  deleteCircleInvite: (...args: unknown[]) => mockDecline(...args),
  getPeopleErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.'),
  setDiscoverable: (...args: unknown[]) => mockSetDiscoverable(...args),
}));

const user = { displayName: 'Ada Lovelace', uid: 'me' } as never;

describe('UsernameForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClaim.mockResolvedValue(undefined);
    mockChange.mockResolvedValue(undefined);
    mockSetDiscoverable.mockResolvedValue(undefined);
  });

  it('suggests a handle from the display name and claims it', async () => {
    const onSaved = jest.fn();
    const screen = await render(<UsernameForm onSaved={onSaved} profile={null} user={user} />);

    expect(screen.getByLabelText('Username').props.value).toBe('ada.lovelace');
    await fireEvent.press(screen.getByRole('button', { name: 'Claim username' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockClaim).toHaveBeenCalledWith({ discoverable: true, user, username: 'ada.lovelace' });
  });

  it('blocks invalid handles before calling the server', async () => {
    const screen = await render(<UsernameForm onSaved={jest.fn()} profile={null} user={user} />);
    await fireEvent.changeText(screen.getByLabelText('Username'), 'a b');

    expect(screen.getByText('Use only letters, numbers, underscores and dots.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Claim username' }));
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('shows a taken username as an error', async () => {
    mockClaim.mockRejectedValue(new Error('That username is already taken.'));
    const onSaved = jest.fn();
    const screen = await render(<UsernameForm onSaved={onSaved} profile={null} user={user} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Claim username' }));

    expect(await screen.findByText('That username is already taken.')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('locks the handle during the 30-day cooldown but still lets discoverability change', async () => {
    const profile = {
      avatarSeed: 'me', avatarStyle: 'sprouts', discoverable: true, displayName: 'Ada', userId: 'me',
      username: 'ada.one', usernameChangedAt: new Date(),
    };
    const screen = await render(<UsernameForm onSaved={jest.fn()} profile={profile} user={user} />);

    expect(screen.getByLabelText('Username').props.editable).toBe(false);
    await fireEvent(screen.getByLabelText('Show me in Find people'), 'valueChange', false);
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockSetDiscoverable).toHaveBeenCalledWith({ discoverable: false, userId: 'me' }));
    expect(mockChange).not.toHaveBeenCalled();
  });
});

describe('PeopleShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccept.mockResolvedValue(undefined);
    mockDecline.mockResolvedValue(undefined);
    mockInvites = [{ circleId: 'CIRCLE01', circleName: 'Morning Walkers', id: 'CIRCLE01_me', inviterDisplayName: 'Grace' }];
  });

  it('accepts an invitation through the server and refreshes circles', async () => {
    const onJoined = jest.fn();
    const screen = await render(<PeopleShortcuts onJoined={onJoined} />);

    expect(screen.getByText('Morning Walkers')).toBeTruthy();
    expect(screen.getByText('From Grace')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => expect(onJoined).toHaveBeenCalled());
    expect(mockAccept).toHaveBeenCalledWith({ invite: mockInvites[0], user: { displayName: 'Ada Lovelace', uid: 'me' } });
  });

  it('declines an invitation and reports failures', async () => {
    mockDecline.mockRejectedValue(new Error('You appear to be offline.'));
    const screen = await render(<PeopleShortcuts onJoined={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Decline' }));

    expect(await screen.findByText('You appear to be offline.')).toBeTruthy();
    expect(mockDecline).toHaveBeenCalled();
  });

  it('opens Find people and counts waiting friend requests', async () => {
    mockInvites = [];
    const screen = await render(<PeopleShortcuts onJoined={jest.fn()} />);

    expect(screen.getByText('2 friend requests waiting')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Find people' }));
    expect(mockPush).toHaveBeenCalledWith('/people');
  });
});
