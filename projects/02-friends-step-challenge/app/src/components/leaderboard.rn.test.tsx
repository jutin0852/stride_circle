import { render } from '@testing-library/react-native';

import { Leaderboard } from '@/components/leaderboard';
import { friends } from '@/data/circle';

describe('<Leaderboard />', () => {
  it('renders member names and formatted verified steps', async () => {
    const { getByText } = await render(<Leaderboard friends={friends.slice(0, 2)} />);

    expect(getByText('Ada')).toBeTruthy();
    expect(getByText('You')).toBeTruthy();
    expect(getByText('7,982')).toBeTruthy();
    expect(getByText('6,842')).toBeTruthy();
  });
});
