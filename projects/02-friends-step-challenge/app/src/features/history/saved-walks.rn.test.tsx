import { render, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { ActivityRecord } from '@/lib/activities';
import { SavedWalks } from './saved-walks';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const records: ActivityRecord[] = Array.from({ length: 7 }, (_, index) => ({
  activityType: 'walk',
  averagePaceSecondsPerKm: null,
  dateKey: '2026-10-09',
  distanceMeters: 1_200,
  durationMs: 600_000,
  id: `walk-${index + 1}`,
  route: [],
  title: `Saved walk ${index + 1}`,
}));

describe('saved walks in History', () => {
  it('fills the available History content width', async () => {
    const screen = await render(<SavedWalks records={records} status="ready" onOpen={jest.fn()} onRetry={jest.fn()} dateKey="2026-10-09" />);

    expect(StyleSheet.flatten(screen.getByTestId('history-saved-walks').props.style).width).toBe('100%');
  });

  it('shows five recent walks initially and expands the full list on request', async () => {
    const screen = await render(<SavedWalks records={records} status="ready" onOpen={jest.fn()} onRetry={jest.fn()} dateKey="2026-10-09" />);

    expect(screen.getAllByRole('button')).toHaveLength(6);
    await userEvent.setup().press(screen.getByRole('button', { name: 'View 7 recent walks' }));
    expect(screen.getAllByRole('button')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Show fewer walks' })).toBeTruthy();
  });
});
