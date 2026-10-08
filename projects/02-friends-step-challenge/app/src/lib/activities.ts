import {
  collection,
  doc,
  type DocumentData,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { getLocalTimeZone } from '@/lib/daily-steps';
import { database, requireFirebase } from '@/lib/firebase';
import type { CircleActivityType } from '@/lib/circles';
import type { RoutePoint } from '@/hooks/use-activity-tracking';
import { simplifyRoute } from '@/lib/route';

export function createActivityId(userId: string) {
  const db = requireFirebase(database, 'Firestore');
  return doc(collection(db, 'users', userId, 'activities')).id;
}

type StoredActivityType = CircleActivityType | 'run';

export type ActivityRecord = {
  activityType: StoredActivityType;
  averagePaceSecondsPerKm: number | null;
  dateKey: string;
  distanceMeters: number;
  durationMs: number;
  id: string;
  route: RoutePoint[];
  title?: string;
  steps?: number | null;
  local?: boolean;
};

function toActivityRecord(id: string, data: DocumentData): ActivityRecord | null {
  if ((data.activityType !== 'run' && data.activityType !== 'walk') || typeof data.dateKey !== 'string' || typeof data.distanceMeters !== 'number' || typeof data.durationMs !== 'number') return null;
  const route = Array.isArray(data.route) ? data.route.flatMap((point) => (
    typeof point?.latitude === 'number' && typeof point?.longitude === 'number'
      ? [{ latitude: point.latitude, longitude: point.longitude, ...(point.segmentStart === true ? { segmentStart: true } : {}) }]
      : []
  )) : [];
  return {
    activityType: data.activityType,
    averagePaceSecondsPerKm: typeof data.averagePaceSecondsPerKm === 'number' ? data.averagePaceSecondsPerKm : null,
    dateKey: data.dateKey,
    distanceMeters: data.distanceMeters,
    durationMs: data.durationMs,
    id,
    route,
    ...(typeof data.title === 'string' ? { title: data.title } : {}),
    ...(typeof data.steps === 'number' ? { steps: data.steps } : {}),
  };
}

export async function saveActivity(input: {
  activityId: string;
  activityType: CircleActivityType;
  dateKey: string;
  distanceMeters: number;
  durationMs: number;
  route: RoutePoint[];
  userId: string;
  title?: string;
  steps?: number | null;
}) {
  const db = requireFirebase(database, 'Firestore');
  const dateKey = input.dateKey;
  const activityReference = doc(db, 'users', input.userId, 'activities', input.activityId);
  const averagePaceSecondsPerKm = input.distanceMeters > 0
    ? input.durationMs / 1_000 / (input.distanceMeters / 1_000)
    : null;
  const memberships = await getDocs(collection(db, 'users', input.userId, 'circleMemberships'));
  const matchingCircleIds = memberships.docs.flatMap((membership) => (
    membership.data().activityType === input.activityType ? [membership.id] : []
  ));

  await runTransaction(db, async (transaction) => {
    // A retry uses the same ID: never duplicate an activity or circle increments.
    if ((await transaction.get(activityReference)).exists()) return;
    transaction.set(activityReference, {
      activityType: input.activityType,
      averagePaceSecondsPerKm,
      createdAt: serverTimestamp(),
      dateKey,
      distanceMeters: input.distanceMeters,
      durationMs: input.durationMs,
      route: simplifyRoute(input.route),
      timeZone: getLocalTimeZone(),
      ...(input.title ? { title: input.title } : {}),
      ...(input.steps !== undefined ? { steps: input.steps } : {}),
    });

    matchingCircleIds.forEach((circleId) => {
      transaction.set(
        doc(db, 'circles', circleId, 'dailyActivities', dateKey, 'entries', input.userId),
        {
          activityType: input.activityType,
          activityCount: increment(1),
          dateKey,
          distanceMeters: increment(input.distanceMeters),
          durationMs: increment(input.durationMs),
          updatedAt: serverTimestamp(),
          userId: input.userId,
        },
        { merge: true },
      );
    });
  });
}

export function watchActivityHistory(
  userId: string,
  onChange: (records: ActivityRecord[]) => void,
  onError: () => void,
  dateKey?: string,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    dateKey ? query(collection(db, 'users', userId, 'activities'), where('dateKey', '==', dateKey))
      : query(collection(db, 'users', userId, 'activities'), orderBy('createdAt', 'desc'), limit(30)),
    (snapshot) => onChange(snapshot.docs.flatMap((document) => {
      const record = toActivityRecord(document.id, document.data());
      return record ? [record] : [];
    })),
    onError,
  );
}

export function watchActivityRecord(
  userId: string,
  activityId: string,
  onChange: (record: ActivityRecord | null) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    doc(db, 'users', userId, 'activities', activityId),
    (snapshot) => onChange(snapshot.exists() ? toActivityRecord(snapshot.id, snapshot.data()) : null),
    onError,
  );
}
