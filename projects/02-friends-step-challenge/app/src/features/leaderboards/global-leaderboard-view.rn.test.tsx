import { Text as MockText, View as MockView } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { GlobalLeaderboardView } from './global-leaderboard-view';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/leaderboard', () => ({ Leaderboard: ({ friends }: { friends: { name: string }[] }) => <MockView>{friends.map((friend) => <MockText key={friend.name}>{friend.name}</MockText>)}</MockView> }));

const entries = [
  { avatar: { seed: 'ada', style: 'sprouts' as const }, displayName: 'Ada', rank: 1, userId: 'ada', verifiedSteps: 7982 },
  { avatar: { seed: 'you', style: 'clay' as const }, displayName: 'Jutin', rank: 2, userId: 'you', verifiedSteps: 6842 },
];

describe('GlobalLeaderboardView', () => {
  it('shows the period controls and ranked walking entries', async () => {
    const { getAllByText, getByText, getByRole } = await render(
      <GlobalLeaderboardView
        currentUser={entries[1]}
        entries={entries}
        generatedAt={null}
        onBack={jest.fn()}
        onChangePeriod={jest.fn()}
        onRetry={jest.fn()}
        period="week"
        status="ready"
      />,
    );

    expect(getByText('Walking worldwide')).toBeTruthy();
    expect(getAllByText('Ada').length).toBeGreaterThan(0);
    expect(getAllByText('Jutin').length).toBeGreaterThan(0);
    expect(getByRole('tab', { name: 'All Time' })).toBeTruthy();
  });

  it('renders an honest empty state when no global projection exists yet', async () => {
    const { getByText, queryByText } = await render(
      <GlobalLeaderboardView
        currentUser={null}
        entries={[]}
        generatedAt={null}
        onBack={jest.fn()}
        onChangePeriod={jest.fn()}
        onRetry={jest.fn()}
        period="week"
        status="ready"
      />,
    );

    expect(getByText('No global standings yet')).toBeTruthy();
    expect(queryByText('Ada')).toBeNull();
  });

  it('exposes retry for a failed leaderboard load', async () => {
    const onRetry = jest.fn();
    const { getByRole } = await render(
      <GlobalLeaderboardView
        currentUser={null}
        entries={[]}
        generatedAt={null}
        onBack={jest.fn()}
        onChangePeriod={jest.fn()}
        onRetry={onRetry}
        period="week"
        status="error"
      />,
    );

    fireEvent.press(getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
