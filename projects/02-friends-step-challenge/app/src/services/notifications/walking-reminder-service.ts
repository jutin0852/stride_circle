import { DEFAULT_WALKING_REMINDER, isReminderTime, readReminderPreferences, type ReminderPermission, type WalkingReminderPreferences } from '@/domain/walking-reminders';

export type ScheduledWalkingReminder = { identifier: string; userId: string; hour?: number; minute?: number; test: boolean };
export type ReminderDevice = {
  getPermission: () => Promise<ReminderPermission>;
  requestPermission: () => Promise<ReminderPermission>;
  getScheduled: () => Promise<ScheduledWalkingReminder[]>;
  cancel: (identifier: string) => Promise<void>;
  scheduleDaily: (userId: string, preferences: WalkingReminderPreferences) => Promise<void>;
  scheduleTest: (userId: string) => Promise<void>;
};
export type ReminderStatus = { preferences: WalkingReminderPreferences; permission: ReminderPermission; scheduled: boolean };
type ReminderStorage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> };
const storageKey = (userId: string) => `walking-reminder:v1:${userId}`;

/** Serialize native scheduling so enabling, account changes and sign-out cannot race. */
export function createWalkingReminderService(storage: ReminderStorage, device: ReminderDevice) {
  let activeUserId: string | null = null;
  let pending: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation, operation);
    pending = next.catch(() => {});
    return next;
  }
  async function reconcile(): Promise<ReminderStatus> {
    const userId = activeUserId;
    const preferences = userId ? readReminderPreferences(await storage.getItem(storageKey(userId))) : { ...DEFAULT_WALKING_REMINDER };
    const permission = await device.getPermission();
    if (permission === 'unavailable' || permission === 'unsupported') return { preferences, permission, scheduled: false };
    const notifications = await device.getScheduled();
    let scheduled = false;
    for (const notification of notifications) {
      const belongsToUser = notification.userId === userId && userId === activeUserId;
      const keep = belongsToUser && preferences.enabled && permission === 'granted' && (notification.test || (
        !scheduled && notification.hour === preferences.hour && notification.minute === preferences.minute
      ));
      if (keep && !notification.test) scheduled = true;
      if (!keep) await device.cancel(notification.identifier);
    }
    if (userId && userId === activeUserId && preferences.enabled && permission === 'granted' && !scheduled) {
      await device.scheduleDaily(userId, preferences);
      // A sign-out may arrive while the native schedule call is in flight.
      if (userId !== activeUserId) {
        for (const notification of await device.getScheduled()) await device.cancel(notification.identifier);
      } else scheduled = true;
    }
    return { preferences, permission, scheduled };
  }
  async function requirePermission(request: boolean) {
    let permission = await device.getPermission();
    if (request && permission === 'undetermined') permission = await device.requestPermission();
    if (permission === 'unsupported') throw new Error('Walking reminders are available on iPhone and Android.');
    if (permission === 'unavailable') throw new Error('Walking reminders need an updated app build.');
    if (permission !== 'granted') throw new Error('Allow notifications in your phone settings to receive walking reminders.');
  }
  function requireActiveUser(userId: string) {
    if (userId !== activeUserId) throw new Error('Sign in again to change your walking reminder.');
  }
  return {
    activate(userId: string | null) {
      activeUserId = userId;
      return enqueue(reconcile);
    },
    refresh() { return enqueue(reconcile); },
    save(userId: string, preferences: WalkingReminderPreferences) {
      return enqueue(async () => {
        requireActiveUser(userId);
        if (!isReminderTime(preferences.hour, preferences.minute)) throw new Error('Enter a time between 00:00 and 23:59.');
        if (preferences.enabled) await requirePermission(true);
        requireActiveUser(userId);
        const previous = await storage.getItem(storageKey(userId));
        await storage.setItem(storageKey(userId), JSON.stringify(preferences));
        try { return await reconcile(); }
        catch (error) {
          await storage.setItem(storageKey(userId), previous ?? JSON.stringify(DEFAULT_WALKING_REMINDER));
          // Best effort restores the previous schedule; the original failure stays visible.
          await reconcile().catch(() => {});
          throw error;
        }
      });
    },
    test(userId: string) {
      return enqueue(async () => {
        requireActiveUser(userId);
        await requirePermission(false);
        if (!readReminderPreferences(await storage.getItem(storageKey(userId))).enabled) throw new Error('Save an enabled walking reminder before sending a test.');
        requireActiveUser(userId);
        await device.scheduleTest(userId);
        if (userId !== activeUserId) await reconcile();
      });
    },
  };
}
