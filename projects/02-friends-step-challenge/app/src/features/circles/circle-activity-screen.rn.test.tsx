import { fireEvent, render } from '@testing-library/react-native';

import { CircleActivityScreen } from './circle-activity-screen';

const mockPush = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => ({ circleId: 'circle-1' }),
}));
jest.mock('@/hooks/use-circle-details', () => ({
  useCircleDetails: () => ({ details: { circle: { id: 'circle-1', name: 'Morning Walkers', weeklyStepGoal: 75_000 }, members: [] }, status: 'ready' }),
}));
jest.mock('@/hooks/use-circle-period-steps', () => ({ useCirclePeriodSteps: () => ({ stepsByDate: {}, status: 'ready' }) }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: null }) }));

describe('circle Activity destination', () => {
  beforeEach(() => mockPush.mockClear());

  it('offers the shared goal, last-week recap, and walk-together destinations', async () => {
    const screen = await render(<CircleActivityScreen />);
    expect(screen.getByRole('header', { name: 'Activity' })).toBeTruthy();
    expect(screen.getByText('Shared weekly goal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Last week’s recap' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Walk together' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Last week’s recap' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/circle/[circleId]/recap', params: { circleId: 'circle-1' } });
  });
});
