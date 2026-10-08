import { render, userEvent } from '@testing-library/react-native';
import { HistoryRecap } from './history-recap';

jest.mock('panelui-native/components/bar-chart', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react') as typeof import('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native') as typeof import('react-native');
  const Chart = (props: React.ComponentProps<typeof View> & { children?: React.ReactNode }) => React.createElement(View, props, props.children);
  const Child = () => null;
  return { BarChart: Object.assign(Chart, { Bar: Child, Grid: Child, Skeleton: Child, Tooltip: Child, XAxis: Child, YAxis: Child }) };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const props = { records: [{ dateKey: '2026-10-06', steps: 2000 }], today: '2026-10-06', goal: 8000, goalReady: true, status: 'ready' as const, onRetry: jest.fn() };

describe('PanelUI weekly walking bar chart', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders seven days of personal steps with saved and missing states', async () => {
    const screen = await render(<HistoryRecap {...props} />);
    const chart = screen.getByTestId('history-weekly-bar-chart');
    const today = chart.props.data.find((datum: { dateKey: string }) => datum.dateKey === props.today);
    const missingDay = chart.props.data.find((datum: { dateKey: string }) => datum.dateKey === '2026-10-05');
    const futureDay = chart.props.data.find((datum: { dateKey: string }) => datum.dateKey === '2026-10-07');

    expect(chart.props.data).toHaveLength(7);
    expect(chart.props.data.map((datum: { dateKey: string }) => datum.dateKey)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ]);
    expect(chart.props.xDataKey).toBe('day');
    expect(chart.props.yDomain).toEqual([0, 8000]);
    expect(today).toMatchObject({ saved: 1, steps: 2000 });
    expect(missingDay).toMatchObject({ saved: 0, steps: 0 });
    expect(futureDay).toMatchObject({ future: 1, saved: 0, steps: 0 });
    expect(chart.props.accessibilityLabelForDatum(today, 6)).toContain('2,000 steps');
    expect(chart.props.accessibilityLabelForDatum(missingDay, 5)).toContain('No saved steps');
    expect(chart.props.accessibilityLabelForDatum(futureDay, 2)).toContain('Future day');
  });

  it('keeps loading, retry, goal, and updated data states', async () => {
    const screen = await render(<HistoryRecap {...props} status="loading" />);
    expect(screen.getByTestId('history-weekly-bar-chart').props.status).toBe('loading');

    await screen.rerender(<HistoryRecap {...props} status="error" />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);

    await screen.rerender(<HistoryRecap {...props} records={[{ dateKey: props.today, steps: 8000 }]} />);
    expect(screen.getByTestId('history-weekly-bar-chart').props.status).toBe('ready');
    expect(screen.getByTestId('history-weekly-bar-chart').props.yDomain).toEqual([0, 8000]);
    expect(screen.getByText('1 goal day')).toBeTruthy();

    await screen.rerender(<HistoryRecap {...props} records={[{ dateKey: props.today, steps: 10000 }]} />);
    expect(screen.getByTestId('history-weekly-bar-chart').props.yDomain).toEqual([0, 12000]);

    await screen.rerender(<HistoryRecap {...props} goalReady={false} />);
    expect(screen.getByText(/Goal unavailable/)).toBeTruthy();
  });
});
