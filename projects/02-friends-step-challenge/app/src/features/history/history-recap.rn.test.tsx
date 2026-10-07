import { fireEvent, render, userEvent } from '@testing-library/react-native';
import { HistoryRecap } from './history-recap';
import { trailPositionAtX, weeklyTrail } from './weekly-trail';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const props = { records: [{ dateKey: '2026-10-06', steps: 2000 }], today: '2026-10-06', goal: 8000, goalReady: true, status: 'ready' as const, onRetry: jest.fn() };

describe('data-driven weekly walking trail', () => {
  it('moves the inspector across days during a drag and clamps outside the chart', async () => {
    const screen = await render(<HistoryRecap {...props} />);
    const interaction = screen.getByTestId('history-weekly-interaction');
    await fireEvent(interaction, 'layout', { nativeEvent: { layout: { width: 308 } } });
    await fireEvent(interaction, 'responderGrant', { nativeEvent: { pageX: 286 } });
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('2,000 steps');
    await fireEvent(interaction, 'responderMove', { nativeEvent: { pageX: 66 } });
    expect(screen.getByTestId('history-weekly-marker').props.cx).toBe(66);
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('No saved steps');
    await fireEvent(interaction, 'responderMove', { nativeEvent: { pageX: 44 } });
    expect(screen.getByTestId('history-weekly-marker').props.cx).toBe(44);
    expect(screen.getByTestId('history-weekly-marker').props.cy).toBeCloseTo(trailPositionAtX(44, weeklyTrail(props.records, props.today, props.goal)).y, 3);
    await fireEvent(interaction, 'responderMove', { nativeEvent: { pageX: -100 } });
    expect(screen.getByTestId('history-weekly-marker').props.cx).toBe(22);
    await fireEvent(interaction, 'responderMove', { nativeEvent: { pageX: 999 } });
    expect(screen.getByTestId('history-weekly-marker').props.cx).toBe(286);
  });
  it('lets users inspect exact real totals and missing days without changing data', async () => {
    const screen = await render(<HistoryRecap {...props} />);
    const user = userEvent.setup();
    await user.press(screen.getByTestId('history-weekly-day-2026-10-06'));
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('2,000 steps');
    expect(screen.getByTestId('history-weekly-marker').props.cx).toBe(286);
    await screen.rerender(<HistoryRecap {...props} records={[{ dateKey: '2026-10-06', steps: 2345 }]} />);
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('2,345 steps');
    await user.press(screen.getByTestId('history-weekly-day-2026-10-05'));
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('No saved steps');
    expect(screen.getByTestId('history-weekly-marker').props.cx).toBe(242);
    expect(props.records[0].steps).toBe(2000);
  });
  it('keeps waypoints aligned to equal-width touch columns', async () => {
    const screen = await render(<HistoryRecap {...props} />);
    expect(screen.getByTestId('history-weekly-trail').props.align).toBe('none');
    expect(screen.getAllByRole('button')).toHaveLength(7);
    expect(screen.getByTestId('history-weekly-trail-line').props.d).toBe(weeklyTrail(props.records, props.today, props.goal).path);
    expect(screen.queryByTestId('history-weekly-tooltip')).toBeNull();
    expect(screen.queryByTestId('history-weekly-marker')).toBeNull();
    const track = screen.getByTestId('history-weekly-trail-line');
    const dots = screen.getByTestId('history-weekly-trail-dots');
    expect(track.props.strokeWidth).toBe(13);
    expect(track.props.strokeDasharray).toBeUndefined();
    expect(dots.props.strokeWidth).toBe(3);
    expect(dots.props.strokeDasharray.map(Number)).toEqual([1, 12]);
    expect(dots.props.d).toBe(track.props.d);
  });
  it('updates measured heights, totals and goal states while retaining track styling', async () => {
    const screen = await render(<HistoryRecap {...props} />);
    const original = screen.getByTestId('history-weekly-trail-line').props.d;
    await screen.rerender(<HistoryRecap {...props} records={[{ dateKey: '2026-10-06', steps: 8000 }]} />);
    expect(screen.getByTestId('history-weekly-trail-line').props.d).not.toBe(original);
    expect(screen.getByText('8.0k')).toBeTruthy();
    expect(screen.getByText('1 goal day')).toBeTruthy();
  });
  it('keeps zero and missing days on the baseline as saved steps change', async () => {
    const screen = await render(<HistoryRecap {...props} records={[{ dateKey: '2026-10-06', steps: 0 }]} />);
    await userEvent.setup().press(screen.getByTestId('history-weekly-day-2026-10-06'));
    expect(screen.getByTestId('history-weekly-marker').props.cy).toBe(64);
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('0 steps');
    await screen.rerender(<HistoryRecap {...props} />);
    expect(screen.getByTestId('history-weekly-marker').props.cy).toBe(52);
    await userEvent.setup().press(screen.getByTestId('history-weekly-day-2026-10-05'));
    expect(screen.getByTestId('history-weekly-marker').props.cy).toBe(64);
    expect(screen.getByTestId('history-weekly-tooltip').props.children).toContain('No saved steps');
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
