import * as Notifications from 'expo-notifications';
import { reminderDevice, observeWalkingReminderTaps } from './notification-device.native';
import { WALKING_REMINDER_KIND } from '@/domain/walking-reminders';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'scheduled'),
  setNotificationChannelAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
}));

beforeEach(() => jest.clearAllMocks());

function request(identifier: string, data: Record<string, unknown>): Notifications.NotificationRequest {
  return { identifier, trigger: null, content: { title: null, subtitle: null, body: null, sound: null, categoryIdentifier: null, data } };
}

describe('native walking reminder adapter (React Native runtime)', () => {
  it('schedules a daily local-time trigger without requesting a push token', async () => {
    await reminderDevice.scheduleDaily('walker', { enabled: true, hour: 18, minute: 30 });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      identifier: 'walking-reminder.walker',
      trigger: { type: 'daily', hour: 18, minute: 30, channelId: 'walking-reminders' },
      content: expect.objectContaining({ data: { kind: WALKING_REMINDER_KIND, userId: 'walker', hour: 18, minute: 30 } }),
    }));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
  it('only returns reminders it owns so other notification schedules stay untouched', async () => {
    jest.mocked(Notifications.getAllScheduledNotificationsAsync).mockResolvedValueOnce([
      request('other', { kind: 'other-feature' }),
      request('ours', { kind: WALKING_REMINDER_KIND, userId: 'walker', hour: 8, minute: 0 }),
    ]);
    expect(await reminderDevice.getScheduled()).toEqual([{ identifier: 'ours', userId: 'walker', hour: 8, minute: 0, test: false }]);
  });
  it('allows iOS provisional authorization', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false, canAskAgain: false, ios: { status: 3 } } as Notifications.NotificationPermissionsStatus);
    expect(await reminderDevice.getPermission()).toBe('granted');
  });
  it('ignores other accounts and deduplicates taps, but permits the next daily occurrence', async () => {
    const onTap = jest.fn();
    const stop = observeWalkingReminderTaps('walker', onTap);
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
    const response = (userId: string, date: number): Notifications.NotificationResponse => ({ actionIdentifier: 'default', notification: {
      date, request: request('walking-reminder.walker', { kind: WALKING_REMINDER_KIND, userId }),
    } });
    listener(response('other-walker', 1));
    listener(response('walker', 1));
    listener(response('walker', 1));
    listener(response('walker', 2));
    expect(onTap).toHaveBeenCalledTimes(2);
    stop();
    listener(response('walker', 3));
    expect(onTap).toHaveBeenCalledTimes(2);
  });
});
