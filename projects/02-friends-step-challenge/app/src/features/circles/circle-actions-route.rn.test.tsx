import { fireEvent, render } from '@testing-library/react-native';

import CircleActionsRoute from '@/app/circle/[circleId]/actions';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args), dismissAll: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => ({ circleId: 'circle-1' }),
}));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'owner-1' } }) }));
jest.mock('@/hooks/use-circle-details', () => ({
  useCircleDetails: () => ({
    details: {
      circle: { description: 'Meet up and walk together.', id: 'circle-1', inviteCode: 'WALK42', memberCount: 2, name: 'Saturday Neighborhood Riverside Walkers', ownerId: 'owner-1', visibility: 'private' },
      members: [{ avatarSeed: 'owner', avatarStyle: 'sprouts', displayName: 'Circle Owner', role: 'owner', userId: 'owner-1' }],
    },
    status: 'ready',
  }),
}));
jest.mock('@/lib/circles', () => ({ deleteCircle: jest.fn(), removeCircleMember: jest.fn() }));

describe('circle details page', () => {
  beforeEach(() => { mockBack.mockClear(); mockPush.mockClear(); });

  it('groups the circle actions with clear, accessible labels', async () => {
    const screen = await render(<CircleActionsRoute />);

    const circleTitle = screen.getByRole('header', { name: 'Saturday Neighborhood Riverside Walkers' });
    expect(circleTitle.props.numberOfLines).toBeUndefined();
    expect(screen.getByText('About this circle')).toBeTruthy();
    expect(screen.getByText('Meet up and walk together.')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Invite friends/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /View invite code/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Edit circle/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Circle members/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Report this circle/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Safety reports/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Delete circle/ })).toBeTruthy();
  });

  it('keeps edit navigation available from the page', async () => {
    const screen = await render(<CircleActionsRoute />);
    fireEvent.press(screen.getByRole('button', { name: /Edit circle/ }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/circle/[circleId]/edit', params: { circleId: 'circle-1' } });
  });

  it('opens the circle safety inbox from owner settings', async () => {
    const screen = await render(<CircleActionsRoute />);
    fireEvent.press(screen.getByRole('button', { name: /Safety reports/ }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: '/circle/[circleId]/reports', params: { circleId: 'circle-1' } });
  });

  it('provides page navigation back to circle standings', async () => {
    const screen = await render(<CircleActionsRoute />);
    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
