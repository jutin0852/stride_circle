import { Alert } from 'react-native';
import { fireEvent, render, userEvent, waitFor } from '@testing-library/react-native';

import { CirclesView, type CirclesViewProps } from './circles-view';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null, MaterialCommunityIcons: () => null }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));

const joined = { activityType: 'walk' as const, id: 'circle-1', name: 'Morning Movers' };
const publicCircle = {
  activityType: 'walk' as const,
  competitionTimeZone: 'Africa/Lagos',
  discoverableArea: 'Yaba',
  id: 'public-1',
  joinPolicy: 'open' as const,
  memberCount: 8,
  name: 'River Path Ramblers',
  visibility: 'public' as const,
};

async function setup(overrides: Partial<CirclesViewProps> = {}) {
  const props: CirclesViewProps = {
    circles: [joined],
    previews: {
      'circle-1': {
        memberCount: 4,
        members: [
          { avatarSeed: 'walker-a', avatarStyle: 'sprouts', displayName: 'Ari Walker', role: 'owner', userId: 'user-a' },
          { avatarSeed: 'walker-b', avatarStyle: 'clay', displayName: 'Bo Walker', role: 'member', userId: 'user-b' },
        ],
      },
    },
    circleStatus: 'ready',
    publicCircles: [publicCircle],
    publicStatus: 'ready',
    busyCircleId: null,
    onOpenCircle: jest.fn(),
    onRetryCircles: jest.fn(),
    onRetryPublic: jest.fn(),
    onCreate: jest.fn().mockResolvedValue(null),
    onJoinInvite: jest.fn().mockResolvedValue(null),
    onJoinPublic: jest.fn().mockResolvedValue(null),
    onOpenGlobalLeaderboard: jest.fn(),
    ...overrides,
  };

  return { props, screen: await render(<CirclesView {...props} />) };
}

describe('Circles hub', () => {
  it('shows joined circle activity from its preview and public discovery metadata', async () => {
    const { props, screen } = await setup();
    const user = userEvent.setup();

    expect(screen.getByText('Your Circles')).toBeTruthy();
    expect(screen.getByText('1 joined')).toBeTruthy();
    expect(screen.queryByText('2 walking today')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Open Morning Movers' }));
    expect(props.onOpenCircle).toHaveBeenCalledWith('circle-1');

    await user.press(screen.getByRole('tab', { name: 'Discover' }));
    expect(screen.getByText('River Path Ramblers')).toBeTruthy();
    expect(screen.getByText('8 members · Yaba')).toBeTruthy();
  });

  it('keeps Your Circles and Discover as separate selectable pages', async () => {
    const { screen } = await setup();
    const user = userEvent.setup();

    expect(screen.getByRole('button', { name: 'Open Morning Movers' })).toBeTruthy();
    expect(screen.queryByText('River Path Ramblers')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create a Circle' })).toBeTruthy();

    await user.press(screen.getByRole('tab', { name: 'Discover' }));
    expect(screen.queryByRole('button', { name: 'Open Morning Movers' })).toBeNull();
    expect(screen.getByText('River Path Ramblers')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create a Circle' })).toBeNull();

    await user.press(screen.getByRole('tab', { name: 'Your Circles' }));
    expect(screen.getByRole('button', { name: 'Open Morning Movers' })).toBeTruthy();
    expect(screen.queryByText('River Path Ramblers')).toBeNull();
  });

  it('opens the global leaderboard from Discover', async () => {
    const { props, screen } = await setup();

    await userEvent.setup().press(screen.getByRole('tab', { name: 'Discover' }));
    await userEvent.setup().press(screen.getByRole('button', { name: 'Open global leaderboard' }));

    expect(props.onOpenGlobalLeaderboard).toHaveBeenCalledTimes(1);
  });

  it('filters public circles by name and area and explains an empty search', async () => {
    const second = { ...publicCircle, id: 'public-2', name: 'Neighborhood Wanderers', discoverableArea: 'Ikeja' };
    const { screen } = await setup({ publicCircles: [publicCircle, second] });
    await userEvent.setup().press(screen.getByRole('tab', { name: 'Discover' }));
    const search = screen.getByLabelText('Search public Circles');

    fireEvent.changeText(search, 'ikeja');
    await waitFor(() => expect(screen.getByText('Neighborhood Wanderers')).toBeTruthy());
    await waitFor(() => expect(screen.queryByText('River Path Ramblers')).toBeNull());

    fireEvent.changeText(search, 'zzz-not-found');
    await waitFor(() => expect(screen.getByText('No Circles match that search. Try another name.')).toBeTruthy());
  });

  it('keeps the create flow functional, including public discovery-area input', async () => {
    const { props, screen } = await setup();
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Create a Circle' }));
    fireEvent.changeText(screen.getByLabelText('Circle name'), 'Saturday Walkers');
    await user.press(screen.getByText('Public'));
    fireEvent.changeText(screen.getByLabelText('Discovery area'), 'Ikeja');
    await user.press(screen.getByRole('button', { name: 'Create walking circle' }));

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith({
      name: 'Saturday Walkers',
      discoverableArea: 'Ikeja',
      visibility: 'public',
    }));
    await waitFor(() => expect(screen.queryByText('Start a walking circle')).toBeNull());
  });

  it('keeps private invite-code joining available from the create sheet', async () => {
    const { props, screen } = await setup();
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Create a Circle' }));
    await user.press(screen.getByRole('tab', { name: 'Join with code' }));
    fireEvent.changeText(screen.getByLabelText('Circle invite code'), 'walk1234');
    await user.press(screen.getByRole('button', { name: 'Join circle' }));

    await waitFor(() => expect(props.onJoinInvite).toHaveBeenCalledWith('walk1234'));
    await waitFor(() => expect(screen.queryByText('Join your people')).toBeNull());
  });

  it('requires confirmation before joining a public circle', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Join circle')?.onPress?.();
    });
    const { props, screen } = await setup();
    const user = userEvent.setup();

    await user.press(screen.getByRole('tab', { name: 'Discover' }));
    await user.press(screen.getByRole('button', { name: /River Path Ramblers/ }));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(
      'Join River Path Ramblers?',
      'You’ll become a member of this public walking circle.',
      expect.any(Array),
    ));
    await waitFor(() => expect(props.onJoinPublic).toHaveBeenCalledWith('public-1'));
    alert.mockRestore();
  });

  it('disables full public circles and preserves retry actions for load errors', async () => {
    const props = { onRetryCircles: jest.fn(), onRetryPublic: jest.fn() };
    const { screen } = await setup({
      circles: [],
      previews: {},
      publicCircles: [],
      circleStatus: 'error',
      publicStatus: 'error',
      ...props,
    });
    const user = userEvent.setup();

    expect(screen.getByText('Your circles didn’t load')).toBeTruthy();
    await user.press(screen.getByRole('tab', { name: 'Discover' }));
    expect(screen.getByText('Public circles are unavailable right now')).toBeTruthy();

    await user.press(screen.getByRole('tab', { name: 'Your Circles' }));
    fireEvent.press(screen.getByLabelText('Retry Your circles didn’t load'));
    await user.press(screen.getByRole('tab', { name: 'Discover' }));
    fireEvent.press(screen.getByLabelText('Retry Public circles are unavailable right now'));
    expect(props.onRetryCircles).toHaveBeenCalled();
    expect(props.onRetryPublic).toHaveBeenCalled();
  });

  it('disables joining a full public circle', async () => {
    const fullCircle = { ...publicCircle, memberCount: 20 };
    const { screen } = await setup({ circles: [], previews: {}, publicCircles: [fullCircle] });
    await userEvent.setup().press(screen.getByRole('tab', { name: 'Discover' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/River Path Ramblers.*full/).props.accessibilityState.disabled).toBe(true);
    });
  });
});
