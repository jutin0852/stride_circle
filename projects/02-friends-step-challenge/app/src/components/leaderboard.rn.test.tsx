import { render } from '@testing-library/react-native';

import { Leaderboard } from '@/components/leaderboard';
import { friends } from '@/data/circle';

jest.mock('react-native-reanimated', () => {
  // PanelUI animates its podium bars; this keeps the component test deterministic
  // without loading the native Worklets runtime in Jest.
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Easing: { cubic: (value: unknown) => value, out: (value: unknown) => value },
    default: { View },
    View,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

describe('<Leaderboard />', () => {
  it('renders member names and formatted verified steps', async () => {
    const { getByText } = await render(<Leaderboard friends={friends.slice(0, 2)} />);

    expect(getByText('Ada')).toBeTruthy();
    expect(getByText('You')).toBeTruthy();
    expect(getByText('7,982')).toBeTruthy();
    expect(getByText('6,842')).toBeTruthy();
  });

  it('keeps the leader centered and supports fewer than three participants', async () => {
    const { getByLabelText } = await render(<Leaderboard friends={friends.slice(0, 2)} />);

    expect(getByLabelText('Rank 1, Ada, 7,982 steps')).toBeTruthy();
    expect(getByLabelText('Rank 2, You, 6,842 steps')).toBeTruthy();
  });
});
