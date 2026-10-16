import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OnboardingFlow } from './onboarding-flow';

const mockSaveDailyGoal = jest.fn();
const mockSaveWeeklyGoal = jest.fn();
const mockRequestStepAccess = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
jest.mock('@/hooks/use-step-tracking', () => ({
  useStepTracking: () => ({ requestStepAccess: mockRequestStepAccess, status: 'ready' }),
}));
jest.mock('@/lib/movement-goals', () => ({
  DEFAULT_DAILY_STEP_GOAL: 6_000,
  DEFAULT_WEEKLY_STEP_GOAL: 42_000,
  DAILY_STEP_GOAL_PRESETS: [4_000, 6_000, 8_000, 10_000, 12_000],
  saveDailyStepGoal: (...args: unknown[]) => mockSaveDailyGoal(...args),
  saveWeeklyStepGoal: (...args: unknown[]) => mockSaveWeeklyGoal(...args),
}));

async function renderFlow(onComplete = jest.fn().mockResolvedValue(undefined)) {
  const screen = await render(
    <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}>
      <OnboardingFlow onComplete={onComplete} userId="walker-1" />
    </SafeAreaProvider>,
  );
  return { onComplete, screen };
}

describe('onboarding flow', () => {
  beforeEach(() => {
    mockSaveDailyGoal.mockReset().mockResolvedValue(undefined);
    mockSaveWeeklyGoal.mockReset().mockResolvedValue(undefined);
    mockRequestStepAccess.mockReset().mockResolvedValue(undefined);
  });

  it('saves a new member’s selected walking plan before allowing setup to continue', async () => {
    const { screen } = await renderFlow();

    await fireEvent.press(screen.getByRole('button', { name: 'Let’s make a plan' }));
    await fireEvent.press(screen.getByRole('radio', { name: /walk with friends/i }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('radio', { name: /8,000/i }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save my walking plan' }));

    await waitFor(() => expect(mockSaveDailyGoal).toHaveBeenCalledWith({ goal: 8_000, userId: 'walker-1' }));
    expect(mockSaveWeeklyGoal).toHaveBeenCalledWith({ goal: 56_000, userId: 'walker-1' });
    expect(screen.getByText('Bring your steps with you.')).toBeTruthy();
  });

  it('keeps health connection optional and sends a finished member to Home', async () => {
    const { onComplete, screen } = await renderFlow();

    await fireEvent.press(screen.getByRole('button', { name: 'Let’s make a plan' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save my walking plan' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue without connecting' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Continue without connecting' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Start at Home' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('home', 'build-a-rhythm'));
  });
});
