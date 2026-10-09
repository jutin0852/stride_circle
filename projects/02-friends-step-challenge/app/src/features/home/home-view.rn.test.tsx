import { render, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeView, type HomeViewProps } from './home-view';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
function setup(overrides: Partial<HomeViewProps> = {}) {
  const action = jest.fn();
  const props: HomeViewProps = {
    greeting: 'walker', profileName: 'Stride Circle member', profileAvatar: { seed: 'walker', style: 'sprouts' }, streak: 12, steps: 6240, goal: 8000, health: 'confirmed', goalEvent: 0,
    circle: null, circleStatus: 'ready', circles: [], source: 'Apple Health', healthBusy: false, connectionError: null,
    onProfile: action, onGoal: action, onHistory: action, onCircle: action, onCircles: action, onRetryCircle: action,
    onSelectCircle: async () => {}, onConnect: async () => {}, onHealthSettings: async () => {}, social: null, ...overrides,
  };
  return { props, action };
}
async function show(props: HomeViewProps) {
  return render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}><HomeView {...props} /></SafeAreaProvider>);
}
describe('Home data states', () => {
  it('shows real progress without routine health status or a false goal label', async () => {
    const { props } = setup(); const screen = await show(props);
    expect(screen.getByText('6,240')).toBeTruthy();
    expect(screen.getByText('1,760 steps to your goal')).toBeTruthy();
    expect(screen.queryByText('Goal reached')).toBeNull();
    expect(screen.queryByText('Health connection')).toBeNull();
  });
  it('shows a goal achievement for confirmed totals only', async () => {
    const { props } = setup({ steps: 8240 }); const screen = await show(props);
    expect(screen.getByText('Goal reached')).toBeTruthy();
    await screen.rerender(<SafeAreaProvider><HomeView {...props} health="stale" /></SafeAreaProvider>);
    expect(screen.queryByText('Goal reached')).toBeNull();
  });
  it('offers permission recovery without displaying missing steps as zero', async () => {
    const { props } = setup({ health: 'unavailable', steps: null }); const screen = await show(props);
    expect(screen.getByText('Today’s total is unavailable')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Connect health access' }));
    expect(screen.getByText('Health connection')).toBeTruthy();
  });
  it('recognizes a confirmed zero as a starting day', async () => {
    const { props } = setup({ steps: 0 }); const screen = await show(props);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('A few steps is a lovely start.')).toBeTruthy();
  });
  it('keeps personal progress while a circle read fails', async () => {
    const { props, action } = setup({ circleStatus: 'error' }); const screen = await show(props);
    expect(screen.getByText('6,240')).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('lets a new walker find a circle', async () => {
    const { props, action } = setup(); const screen = await show(props);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Find your circle' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
});
