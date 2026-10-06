import AsyncStorage from '@react-native-async-storage/async-storage';

import type { HealthDataSource } from '@/services/health-data/types';

const STORAGE_KEY = '@stride-circle/pending-daily-step-sync/v1';

export type PendingDailyStepSync = {
  circleDateKey?: string;
  circleId?: string;
  circleTimeZone?: string;
  dateKey: string;
  source?: HealthDataSource | 'ios-pedometer';
  steps: number;
  updatedAt: number;
  userId: string;
};

let storageQueue: Promise<void> = Promise.resolve();

function withStorage<T>(operation: () => Promise<T>) {
  const next = storageQueue.then(operation, operation);
  storageQueue = next.then(() => undefined, () => undefined);
  return next;
}

function getEntryKey(entry: Pick<PendingDailyStepSync, 'circleDateKey' | 'circleId' | 'dateKey' | 'userId'>) {
  return [entry.userId, entry.dateKey, entry.circleId ?? '', entry.circleDateKey ?? ''].join(':');
}

function isPendingDailyStepSync(value: unknown): value is PendingDailyStepSync {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<PendingDailyStepSync>;
  return typeof entry.userId === 'string'
    && typeof entry.dateKey === 'string'
    && typeof entry.steps === 'number'
    && Number.isFinite(entry.steps)
    && entry.steps >= 0
    && typeof entry.updatedAt === 'number';
}

async function readEntries() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPendingDailyStepSync) : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries: PendingDailyStepSync[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getPendingDailyStepSync(userId: string, dateKey: string) {
  return withStorage(async () => {
    const entries = await readEntries();
    return entries
      .filter((entry) => entry.userId === userId && entry.dateKey === dateKey)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  });
}

export function savePendingDailyStepSync(entry: PendingDailyStepSync) {
  return withStorage(async () => {
    const entries = await readEntries();
    const entryKey = getEntryKey(entry);
    const existing = entries.find((current) => getEntryKey(current) === entryKey);
    if (existing && existing.updatedAt > entry.updatedAt) return;

    const nextEntries = entries.filter((current) => getEntryKey(current) !== entryKey);
    nextEntries.push(entry);
    await writeEntries(nextEntries);
  });
}

export function removePendingDailyStepSync(entry: PendingDailyStepSync) {
  return withStorage(async () => {
    const entries = await readEntries();
    const entryKey = getEntryKey(entry);
    await writeEntries(entries.filter((current) => getEntryKey(current) !== entryKey || current.updatedAt > entry.updatedAt));
  });
}
