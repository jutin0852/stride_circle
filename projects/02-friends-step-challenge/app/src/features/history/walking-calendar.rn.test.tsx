import { fireEvent, render, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { WalkingCalendar } from './walking-calendar';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

function setup(overrides: Partial<React.ComponentProps<typeof WalkingCalendar>> = {}) {
  const onSelect = jest.fn();
  const onRetry = jest.fn();
  const onMonthChange = jest.fn();
  const props = { month: '2026-10-01', today: '2026-10-03', selected: '2026-10-03', records: [{ dateKey: '2026-10-03', steps: 4000 }], goal: 6000, goalReady: true, protectedDays: [], status: 'ready' as const, compact: false, onSelect, onRetry, onMonthChange, ...overrides };
  return { props, onSelect, onRetry, onMonthChange };
}

describe('walking calendar states', () => {
  it('bounds native week geometry and uses the same geometry for the journey', async () => {
    const { props } = setup({ records: [{ dateKey: '2026-10-01', steps: 8000 }, { dateKey: '2026-10-02', steps: 4000 }] });
    const screen = await render(<WalkingCalendar {...props} />);
    const grid = screen.getByTestId('history-calendar-grid');
    expect(StyleSheet.flatten(grid.props.style).height).toBe(252);
    expect(screen.getAllByTestId('history-calendar-week')).toHaveLength(5);
    for (const row of screen.getAllByTestId('history-calendar-week')) {
      expect(StyleSheet.flatten(row.props.style).height).toBe(48);
      expect(row.children).toHaveLength(7);
    }
    await fireEvent(grid, 'layout', { nativeEvent: { layout: { width: 332, height: 252 } } });
    expect(screen.getByTestId('history-journey').props.height).toBe(252);
    expect(screen.getByTestId('history-journey').props.width).toBe(332);
  });
  it('shows saved progress and lets a user select a past day', async () => {
    const { props, onSelect } = setup();
    const screen = await render(<WalkingCalendar {...props} />);
    expect(screen.getByText('4,000')).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: /October 2, 2026/ }));
    expect(onSelect).toHaveBeenCalledWith('2026-10-02');
  });
  it('disables future dates and the next month', async () => {
    const { props } = setup();
    const screen = await render(<WalkingCalendar {...props} />);
    expect(screen.getByRole('button', { name: 'Next month' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: /October 4, 2026/ }).props.accessibilityState.disabled).toBe(true);
  });
  it('distinguishes missing data from a saved zero', async () => {
    const { props } = setup({ records: [] });
    const screen = await render(<WalkingCalendar {...props} />);
    expect(screen.getByText('No steps were recorded for this day.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryAllByText('0')).toHaveLength(0);
    await screen.rerender(<WalkingCalendar {...props} records={[{ dateKey: '2026-10-03', steps: 0 }]} />);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /0 saved steps/ })).toBeTruthy();
  });
  it('shows an earned protection separately from reaching the goal', async () => {
    const { props } = setup({ protectedDays: ['2026-10-03'] });
    const screen = await render(<WalkingCalendar {...props} />);
    expect(screen.getByText('An earned protection kept your streak going.')).toBeTruthy();
  });
  it('does not calculate achievements when the goal is unavailable', async () => {
    const { props } = setup({ goalReady: false });
    const screen = await render(<WalkingCalendar {...props} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByText('Your goal is unavailable. Saved steps are shown above.')).toBeTruthy();
  });
  it('offers a working retry on a failed monthly read', async () => {
    const { props, onRetry } = setup({ status: 'error' });
    const screen = await render(<WalkingCalendar {...props} />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('4,000')).toBeNull();
  });
  it('hides totals until loading completes', async () => {
    const { props } = setup({ status: 'loading' });
    const screen = await render(<WalkingCalendar {...props} />);
    expect(screen.getByRole('button', { name: /October 2, 2026/ })).toBeTruthy();
    expect(screen.queryByText('4,000')).toBeNull();
    expect(screen.queryByText('no steps saved')).toBeNull();
  });
});
