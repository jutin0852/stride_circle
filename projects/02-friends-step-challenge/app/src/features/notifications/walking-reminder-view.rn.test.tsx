import { render, fireEvent, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalkingReminderView, type WalkingReminderViewProps } from './walking-reminder-view';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

async function setup(overrides: Partial<WalkingReminderViewProps> = {}) {
  const props: WalkingReminderViewProps = {
    enabled: false, time: '18:00', permission: 'undetermined', loading: false, busy: false, scheduled: false,
    error: null, notice: null, onBack: jest.fn(), onEnabledChange: jest.fn(), onTimeChange: jest.fn(),
    onSave: jest.fn(), onTest: jest.fn(), onOpenSettings: jest.fn(), ...overrides,
  };
  const screen = await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 844 }, insets: { top: 44, left: 0, right: 0, bottom: 34 } }}><WalkingReminderView {...props} /></SafeAreaProvider>);
  return { props, screen };
}

describe('Walking reminder settings', () => {
  it('starts off, explains permission and lets someone choose a time', async () => {
    const { props, screen } = await setup();
    expect(screen.getByLabelText('Daily walking reminder').props.value).toBe(false);
    expect(screen.getByText(/Your phone will ask/)).toBeTruthy();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Set reminder time to 08:00' }));
    expect(props.onTimeChange).toHaveBeenCalledWith('08:00');
    fireEvent(screen.getByLabelText('Daily walking reminder'), 'valueChange', true);
    expect(props.onEnabledChange).toHaveBeenCalledWith(true);
  });
  it('offers phone settings when notifications are blocked', async () => {
    const { props, screen } = await setup({ permission: 'denied' });
    await userEvent.setup().press(screen.getByRole('button', { name: 'Open phone settings' }));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Send a test reminder' }).props.accessibilityState.disabled).toBe(true);
  });
  it('explains an older build without letting someone enable an unavailable reminder', async () => {
    const { screen } = await setup({ permission: 'unavailable' });
    expect(screen.getByText(/updated app build/)).toBeTruthy();
    expect(screen.getByLabelText('Daily walking reminder').props.disabled).toBe(true);
  });
  it('lets someone test a saved schedule and shows errors accessibly', async () => {
    const { props, screen } = await setup({ enabled: true, scheduled: true, permission: 'granted', error: 'Please try again.' });
    await userEvent.setup().press(screen.getByRole('button', { name: 'Send a test reminder' }));
    expect(props.onTest).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').props.children).toBe('Please try again.');
  });
});
