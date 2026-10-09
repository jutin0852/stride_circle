import { Platform } from 'react-native';
import type * as ExpoNotifications from 'expo-notifications';

import { WALKING_REMINDER_KIND, type ReminderPermission } from '@/domain/walking-reminders';
import type { ReminderDevice } from './walking-reminder-service';

const CHANNEL_ID = 'walking-reminders';
let notifications: typeof ExpoNotifications | null | undefined;
let foregroundUserId: string | null = null;

function getNotifications() {
  if (notifications !== undefined) return notifications;
  try {
    // Keep older development clients usable until the native module is built in.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifications = require('expo-notifications') as typeof ExpoNotifications;
    notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data ?? {};
        const show = data.kind === WALKING_REMINDER_KIND && data.userId === foregroundUserId;
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
      },
    });
  } catch { notifications = null; }
  return notifications;
}

function permissionOf(permission: ExpoNotifications.NotificationPermissionsStatus): ReminderPermission {
  const api = getNotifications();
  if (permission.granted || permission.ios?.status === api?.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return permission.canAskAgain ? 'undetermined' : 'denied';
}

async function configureChannel() {
  const api = getNotifications();
  if (api && Platform.OS === 'android') await api.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Walking reminders', importance: api.AndroidImportance.DEFAULT, sound: 'default',
  });
}

export const reminderDevice: ReminderDevice = {
  async getPermission() {
    const api = getNotifications();
    return api ? permissionOf(await api.getPermissionsAsync()) : 'unavailable';
  },
  async requestPermission() {
    const api = getNotifications();
    if (!api) return 'unavailable';
    await configureChannel();
    return permissionOf(await api.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
  },
  async getScheduled() {
    const api = getNotifications();
    if (!api) return [];
    return (await api.getAllScheduledNotificationsAsync()).flatMap((notification) => {
      const data = notification.content.data ?? {};
      if (data.kind !== WALKING_REMINDER_KIND || typeof data.userId !== 'string') return [];
      return [{ identifier: notification.identifier, userId: data.userId,
        hour: typeof data.hour === 'number' ? data.hour : undefined,
        minute: typeof data.minute === 'number' ? data.minute : undefined, test: data.test === true }];
    });
  },
  async cancel(identifier) { await getNotifications()?.cancelScheduledNotificationAsync(identifier); },
  async scheduleDaily(userId, preferences) {
    const api = getNotifications();
    if (!api) throw new Error('Walking reminders need an updated app build.');
    await configureChannel();
    await api.scheduleNotificationAsync({
      identifier: `walking-reminder.${userId}`,
      content: { title: 'Time for a little walk', body: 'Take a few steps, clear your head, and make a little room for yourself.',
        sound: 'default', data: { kind: WALKING_REMINDER_KIND, userId, hour: preferences.hour, minute: preferences.minute } },
      trigger: { type: api.SchedulableTriggerInputTypes.DAILY, hour: preferences.hour, minute: preferences.minute, channelId: CHANNEL_ID },
    });
  },
  async scheduleTest(userId) {
    const api = getNotifications();
    if (!api) throw new Error('Walking reminders need an updated app build.');
    await configureChannel();
    await api.scheduleNotificationAsync({
      identifier: `walking-reminder-test.${userId}`,
      content: { title: 'Your walking reminder', body: 'This is how your daily reminder will look. A few steps can be a good start.',
        sound: 'default', data: { kind: WALKING_REMINDER_KIND, userId, test: true } },
      trigger: { type: api.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL_ID },
    });
  },
};

export function observeWalkingReminderTaps(userId: string, onTap: () => void): () => void {
  foregroundUserId = userId;
  const api = getNotifications();
  if (!api) return () => { foregroundUserId = null; };
  let disposed = false;
  let lastIdentifier: string | undefined;
  function handle(response: ExpoNotifications.NotificationResponse) {
    const data = response.notification.request.content.data ?? {};
    const identifier = `${response.notification.request.identifier}:${response.notification.date}`;
    if (disposed || data.kind !== WALKING_REMINDER_KIND || data.userId !== userId || identifier === lastIdentifier) return;
    lastIdentifier = identifier;
    onTap();
    void api?.clearLastNotificationResponseAsync().catch(() => {});
  }
  const subscription = api.addNotificationResponseReceivedListener(handle);
  void api.getLastNotificationResponseAsync().then((response) => { if (response) handle(response); }).catch(() => {});
  return () => { disposed = true; foregroundUserId = null; subscription.remove(); };
}
