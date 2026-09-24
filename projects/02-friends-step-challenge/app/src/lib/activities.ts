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
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { getLocalDateKey, getLocalTimeZone } from '@/lib/daily-steps';
import { database, requireFirebase } from '@/lib/firebase';
import type { CircleActivityType } from '@/lib/circles';
import type { RoutePoint } from '@/hooks/use-activity-tracking';

export type ActivityRecord = {
  activityType: CircleActivityType;
  averagePaceSecondsPerKm: number | null;
  dateKey: string;
  distanceMeters: number;
  durationMs: number;
  id: string;
  route: RoutePoint[];
};

function toActivityRecord(id: string, data: DocumentData): ActivityRecord | null {
  if ((data.activityType !== 'run' && data.activityType !== 'walk') || typeof data.dateKey !== 'string' || typeof data.distanceMeters !== 'number' || typeof data.durationMs !== 'number') return null;
  const route = Array.isArray(data.route) ? data.route.flatMap((point) => (
    typeof point?.latitude === 'number' && typeof point?.longitude === 'number'
      ? [{ latitude: point.latitude, longitude: point.longitude }]
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
  };
}

const MAX_SAVED_ROUTE_POINTS = 250;

function simplifyRoute(route: RoutePoint[]) {
  if (route.length <= MAX_SAVED_ROUTE_POINTS) return route;
  const interval = (route.length - 1) / (MAX_SAVED_ROUTE_POINTS - 1);
  return Array.from({ length: MAX_SAVED_ROUTE_POINTS }, (_, index) => route[Math.round(index * interval)]!);
}

export async function saveActivity(input: {
  activityType: CircleActivityType;
  distanceMeters: number;
  durationMs: number;
  route: RoutePoint[];
  userId: string;
}) {
  const db = requireFirebase(database, 'Firestore');
  const dateKey = getLocalDateKey();
  const activityReference = doc(collection(db, 'users', input.userId, 'activities'));
  const averagePaceSecondsPerKm = input.distanceMeters > 0
    ? input.durationMs / 1_000 / (input.distanceMeters / 1_000)
    : null;
  const batch = writeBatch(db);
  const memberships = await getDocs(collection(db, 'users', input.userId, 'circleMemberships'));
  const matchingCircleIds = memberships.docs.flatMap((membership) => (
    membership.data().activityType === input.activityType ? [membership.id] : []
  ));

  batch.set(activityReference, {
    activityType: input.activityType,
    averagePaceSecondsPerKm,
    createdAt: serverTimestamp(),
    dateKey,
    distanceMeters: input.distanceMeters,
    durationMs: input.durationMs,
    route: simplifyRoute(input.route),
    timeZone: getLocalTimeZone(),
  });

  matchingCircleIds.forEach((circleId) => {
    batch.set(
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

  await batch.commit();
}

export function watchActivityHistory(
  userId: string,
  onChange: (records: ActivityRecord[]) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    query(collection(db, 'users', userId, 'activities'), orderBy('createdAt', 'desc'), limit(30)),
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
