import type { ReminderDevice } from './walking-reminder-service';

export const reminderDevice: ReminderDevice = {
  getPermission: async () => 'unsupported',
  requestPermission: async () => 'unsupported',
  getScheduled: async () => [],
  cancel: async () => {},
  scheduleDaily: async () => {},
  scheduleTest: async () => {},
};

export const observeWalkingReminderTaps: (userId: string, onTap: () => void) => () => void = () => () => {};
