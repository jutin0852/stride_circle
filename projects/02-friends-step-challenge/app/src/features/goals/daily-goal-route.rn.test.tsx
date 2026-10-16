import { fireEvent, render } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DailyGoalRoute from '@/app/daily-goal';

const mockBack = jest.fn();
const mockSaveDailyGoal = jest.fn();
const mockSaveWeeklyGoal = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({ router: { back: (...args: unknown[]) => mockBack(...args) } }));
jest.mock('@/auth/auth-provider', () => ({ useAuth: () => ({ user: { uid: 'walker-1' } }) }));
jest.mock('@/hooks/use-daily-step-goal', () => ({ useDailyStepGoal: () => ({ goal: 6_000, status: 'ready' }) }));
jest.mock('@/hooks/use-weekly-step-goal', () => ({ useWeeklyStepGoal: () => ({ goal: 42_000, status: 'ready' }) }));
jest.mock('@/lib/movement-goals', () => ({
  DAILY_STEP_GOAL_PRESETS: [4_000, 6_000, 8_000, 10_000, 12_000],
  WEEKLY_STEP_GOAL_PRESETS: [21_000, 35_000, 42_000, 56_000, 70_000, 84_000, 105_000],
  isValidDailyStepGoal: (value: number) => Number.isInteger(value) && value >= 1_000 && value <= 100_000,
  isValidWeeklyStepGoal: (value: number) => Number.isInteger(value) && value >= 7_000 && value <= 700_000,
  saveDailyStepGoal: (...args: unknown[]) => mockSaveDailyGoal(...args),
  saveWeeklyStepGoal: (...args: unknown[]) => mockSaveWeeklyGoal(...args),
}));
jest.mock('@/lib/auth', () => ({ getAuthErrorMessage: () => 'Please try again.' }));

async function renderDailyGoal() {
  return await render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}>
      <DailyGoalRoute />
    </SafeAreaProvider>,
  );
}

describe('daily and weekly goal route', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockSaveDailyGoal.mockReset().mockResolvedValue(undefined);
    mockSaveWeeklyGoal.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses the Home button treatment for daily and weekly saves', async () => {
    const screen = await renderDailyGoal();
    for (const name of ['Save daily goal', 'Save weekly target']) {
      expect(StyleSheet.flatten(screen.getByRole('button', { name }).props.style)).toEqual(expect.objectContaining({
        minHeight: 48, borderRadius: 12, borderWidth: 2, borderBottomWidth: 5,
      }));
    }
  });

  it('saves a selected daily preset for the signed-in user', async () => {
    const screen = await renderDailyGoal();

    await fireEvent.press(screen.getByRole('button', { name: '8,000 steps' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save daily goal' }));

    expect(mockSaveDailyGoal).toHaveBeenCalledWith({ goal: 8_000, userId: 'walker-1' });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('saves a custom weekly target for the signed-in user', async () => {
    const screen = await renderDailyGoal();

    await fireEvent.changeText(screen.getByLabelText('Custom weekly step goal'), '77000');
    await fireEvent.press(screen.getByRole('button', { name: 'Save weekly target' }));

    expect(mockSaveWeeklyGoal).toHaveBeenCalledWith({ goal: 77_000, userId: 'walker-1' });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid custom daily goal without saving', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = await renderDailyGoal();

    await fireEvent.changeText(screen.getByLabelText('Custom daily step goal'), '10');
    await fireEvent.press(screen.getByRole('button', { name: 'Save daily goal' }));

    expect(mockSaveDailyGoal).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Choose a valid goal', 'Enter a whole number between 1,000 and 100,000 steps.');
  });
});
