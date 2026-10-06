import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPendingDailyStepSync,
  removePendingDailyStepSync,
  savePendingDailyStepSync,
  type PendingDailyStepSync,
} from './daily-step-sync-queue';

const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { storage.set(key, value); }),
  },
}));

const baseEntry: PendingDailyStepSync = {
  dateKey: '2026-10-06',
  steps: 100,
  updatedAt: 1,
  userId: 'user-1',
};

describe('daily step sync queue', () => {
  beforeEach(() => storage.clear());

  it('keeps the newest cumulative total when writes complete out of order', async () => {
    await savePendingDailyStepSync({ ...baseEntry, steps: 500, updatedAt: 5 });
    await savePendingDailyStepSync({ ...baseEntry, steps: 300, updatedAt: 3 });

    await expect(getPendingDailyStepSync('user-1', '2026-10-06')).resolves.toEqual([
      { ...baseEntry, steps: 500, updatedAt: 5 },
    ]);
  });

  it('does not let an older completion remove a newer queued total', async () => {
    const older = { ...baseEntry, steps: 500, updatedAt: 5 };
    const newer = { ...baseEntry, steps: 900, updatedAt: 9 };
    await savePendingDailyStepSync(older);
    await savePendingDailyStepSync(newer);

    await removePendingDailyStepSync(older);

    await expect(getPendingDailyStepSync('user-1', '2026-10-06')).resolves.toEqual([newer]);
  });
});
