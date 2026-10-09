import { describe, expect, it, vi } from 'vitest';
import type { ReminderPermission } from '@/domain/walking-reminders';
import { createWalkingReminderService, type ReminderDevice, type ScheduledWalkingReminder } from './walking-reminder-service';

function harness(initialPermission: ReminderPermission = 'granted') {
  const records = new Map<string, string>();
  let scheduled: ScheduledWalkingReminder[] = [];
  let permission = initialPermission;
  const storage = {
    getItem: async (key: string) => records.get(key) ?? null,
    setItem: async (key: string, value: string) => { records.set(key, value); },
  };
  const device: ReminderDevice = {
    getPermission: vi.fn(async () => permission),
    requestPermission: vi.fn(async () => { permission = 'granted'; return permission; }),
    getScheduled: vi.fn(async () => [...scheduled]),
    cancel: vi.fn(async (identifier) => { scheduled = scheduled.filter((entry) => entry.identifier !== identifier); }),
    scheduleDaily: vi.fn(async (userId, preferences) => {
      scheduled.push({ identifier: `daily.${userId}`, userId, hour: preferences.hour, minute: preferences.minute, test: false });
    }),
    scheduleTest: vi.fn(async (userId) => { scheduled.push({ identifier: `test.${userId}`, userId, test: true }); }),
  };
  return { service: createWalkingReminderService(storage, device), device, records,
    scheduled: () => scheduled, permission: (next: ReminderPermission) => { permission = next; } };
}
const morning = { enabled: true, hour: 8, minute: 30 };

describe('walking reminder scheduling', () => {
  it('never prompts or schedules until someone opts in', async () => {
    const h = harness('undetermined');
    const status = await h.service.activate('walker');
    expect(status.preferences.enabled).toBe(false);
    expect(h.device.requestPermission).not.toHaveBeenCalled();
    expect(h.scheduled()).toHaveLength(0);
  });
  it('requests permission on opt-in and keeps one daily reminder across refreshes', async () => {
    const h = harness('undetermined');
    await h.service.activate('walker');
    expect((await h.service.save('walker', morning)).scheduled).toBe(true);
    await h.service.refresh();
    await h.service.activate('walker');
    expect(h.device.requestPermission).toHaveBeenCalledTimes(1);
    expect(h.device.scheduleDaily).toHaveBeenCalledTimes(1);
    expect(h.scheduled()).toEqual([{ identifier: 'daily.walker', userId: 'walker', hour: 8, minute: 30, test: false }]);
  });
  it('replaces the old time rather than adding another reminder', async () => {
    const h = harness();
    await h.service.activate('walker');
    await h.service.save('walker', morning);
    await h.service.save('walker', { enabled: true, hour: 18, minute: 0 });
    expect(h.scheduled()).toHaveLength(1);
    expect(h.scheduled()[0].hour).toBe(18);
    expect(h.device.cancel).toHaveBeenCalledWith('daily.walker');
  });
  it('does not save or schedule enabled preferences when permission is denied', async () => {
    const h = harness('denied');
    await h.service.activate('walker');
    await expect(h.service.save('walker', morning)).rejects.toThrow('phone settings');
    expect(h.records.size).toBe(0);
    expect(h.scheduled()).toHaveLength(0);
  });
  it('turning off cancels daily and pending test reminders', async () => {
    const h = harness();
    await h.service.activate('walker');
    await h.service.save('walker', morning);
    await h.service.test('walker');
    await h.service.save('walker', { ...morning, enabled: false });
    expect(h.scheduled()).toHaveLength(0);
  });
  it('stops at sign-out and restores the same account preferences at sign-in', async () => {
    const h = harness();
    await h.service.activate('walker');
    await h.service.save('walker', morning);
    await h.service.activate(null);
    expect(h.scheduled()).toHaveLength(0);
    await h.service.activate('other-walker');
    expect(h.scheduled()).toHaveLength(0);
    expect((await h.service.activate('walker')).preferences).toEqual(morning);
    expect(h.scheduled()).toHaveLength(1);
  });
  it('cancels on permission revocation and restores without another prompt', async () => {
    const h = harness();
    await h.service.activate('walker');
    await h.service.save('walker', morning);
    h.permission('denied');
    const blocked = await h.service.refresh();
    expect(blocked.preferences.enabled).toBe(true);
    expect(blocked.scheduled).toBe(false);
    expect(h.scheduled()).toHaveLength(0);
    h.permission('granted');
    expect((await h.service.refresh()).scheduled).toBe(true);
    expect(h.device.requestPermission).not.toHaveBeenCalled();
  });
  it('handles web and old native clients without scheduling or crashing', async () => {
    for (const permission of ['unsupported', 'unavailable'] as const) {
      const h = harness(permission);
      expect((await h.service.activate('walker')).permission).toBe(permission);
      await expect(h.service.save('walker', morning)).rejects.toThrow();
      expect(h.device.getScheduled).not.toHaveBeenCalled();
    }
  });
  it('rolls back preferences when native scheduling fails', async () => {
    const h = harness();
    await h.service.activate('walker');
    vi.mocked(h.device.scheduleDaily).mockRejectedValueOnce(new Error('Scheduler unavailable'));
    await expect(h.service.save('walker', morning)).rejects.toThrow('Scheduler unavailable');
    expect((await h.service.refresh()).preferences.enabled).toBe(false);
    expect(h.scheduled()).toHaveLength(0);
  });
  it('cleans up a native scheduling call that completes after sign-out starts', async () => {
    const h = harness();
    await h.service.activate('walker');
    let release!: () => void;
    let entered!: () => void;
    const hasEntered = new Promise<void>((resolve) => { entered = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const schedule = h.device.scheduleDaily;
    h.device.scheduleDaily = async (...args) => { entered(); await gate; await schedule(...args); };
    const saving = h.service.save('walker', morning);
    await hasEntered;
    const signingOut = h.service.activate(null);
    release();
    await Promise.all([saving, signingOut]);
    expect(h.scheduled()).toHaveLength(0);
  });
});
