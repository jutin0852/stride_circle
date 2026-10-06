import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';
import { isValidDateKey } from '@/domain/walking-history';
import type { HealthDataSource } from '@/services/health-data';

export type DailyStepRecord = {
  dateKey: string;
  source: HealthDataSource | 'ios-pedometer';
  steps: number;
  timeZone: string;
};

export type DailyStepHistoryRecord = Pick<DailyStepRecord, 'dateKey' | 'steps'>;

/** Bounded overview plus a separate month query: older months remain browsable. */
export function watchStepHistory(
  userId: string,
  range: { from: string; to: string } | null,
  onChange: (records: DailyStepHistoryRecord[]) => void,
  onError: () => void,
) {
  const db = requireFirebase(database, 'Firestore');
  const reference = collection(db, 'users', userId, 'dailySteps');
  const historyQuery = range
    ? query(reference, where('dateKey', '>=', range.from), where('dateKey', '<=', range.to), orderBy('dateKey', 'desc'))
    : query(reference, orderBy('dateKey', 'desc'), limit(400));
  return onSnapshot(historyQuery, (snapshot) => {
    onChange(snapshot.docs.flatMap((document) => {
      const data = document.data();
      if (typeof data.steps !== 'number' || !Number.isFinite(data.steps) || data.steps < 0) return [];
      const dateKey = typeof data.dateKey === 'string' ? data.dateKey : document.id;
      return isValidDateKey(dateKey) ? [{ dateKey, steps: data.steps }] : [];
    }));
  }, onError);
}

function getDailyStepReference(userId: string, dateKey: string) {
  const db = requireFirebase(database, 'Firestore');
  return doc(db, 'users', userId, 'dailySteps', dateKey);
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export async function loadDailySteps(userId: string, dateKey = getLocalDateKey()) {
  const snapshot = await getDoc(getDailyStepReference(userId, dateKey));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return typeof data.steps === 'number' ? data.steps : null;
}

export async function loadDailyStepHistory(userId: string, days = 7) {
  const db = requireFirebase(database, 'Firestore');
  const historyQuery = query(
    collection(db, 'users', userId, 'dailySteps'),
    orderBy('dateKey', 'desc'),
    limit(days),
  );
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs.flatMap((document) => {
    const data = document.data();
    if (typeof data.steps !== 'number') return [];

    return [{
      dateKey: typeof data.dateKey === 'string' ? data.dateKey : document.id,
      steps: data.steps,
    } satisfies DailyStepHistoryRecord];
  });
}

export async function saveDailySteps(input: {
  dateKey?: string;
  source?: HealthDataSource | 'ios-pedometer';
  steps: number;
  userId: string;
}) {
  const dateKey = input.dateKey ?? getLocalDateKey();
  const record: DailyStepRecord = {
    dateKey,
    source: input.source ?? 'expo-pedometer',
    steps: input.steps,
    timeZone: getLocalTimeZone(),
  };

  await setDoc(
    getDailyStepReference(input.userId, dateKey),
    { ...record, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
