import { render, userEvent } from '@testing-library/react-native';
import { HistoryRecap } from './history-recap';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const props = { records: [{ dateKey: '2026-10-06', steps: 2000 }], today: '2026-10-06', goal: 8000, goalReady: true, status: 'ready' as const, onRetry: jest.fn() };

describe('data-driven weekly walking trail', () => {
  it('updates the actual rendered path when steps change', async () => {
    const screen = await render(<HistoryRecap {...props} />);
    const original = screen.getByTestId('history-weekly-trail-line').props.d;
    await screen.rerender(<HistoryRecap {...props} records={[{ dateKey: '2026-10-06', steps: 8000 }]} />);
    expect(screen.getByTestId('history-weekly-trail-line').props.d).not.toBe(original);
    expect(screen.getByText('8.0k')).toBeTruthy();
    expect(screen.getByText('1 goal day')).toBeTruthy();
  });

  it('shows saved zero separately from missing days', async () => {
    const screen = await render(<HistoryRecap {...props} records={[{ dateKey: '2026-10-06', steps: 0 }]} />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(6);
    expect(screen.getByTestId('history-weekly-trail').props.accessibilityLabel).toContain('2026-10-06: 0 steps');
  });

  it('preserves loading, retry and unavailable-goal behavior', async () => {
    const screen = await render(<HistoryRecap {...props} status="loading" />);
    expect(screen.queryByTestId('history-weekly-trail')).toBeNull();
    await screen.rerender(<HistoryRecap {...props} status="error" />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    await screen.rerender(<HistoryRecap {...props} goalReady={false} />);
    expect(screen.getByTestId('history-weekly-trail')).toBeTruthy();
    expect(screen.queryByText('0 goal days')).toBeNull();
  });
});
