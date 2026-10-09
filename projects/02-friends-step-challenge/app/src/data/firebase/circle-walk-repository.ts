import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';
import { MAX_CIRCLE_WALK_DETAILS_LENGTH, MAX_CIRCLE_WALK_MEETUP_LENGTH, MAX_CIRCLE_WALK_TITLE_LENGTH } from '@/domain/circle-walks';
import { isValidTimeZone } from '@/domain/dates';

export type CircleWalkPlan = {
  id: string;
  title: string;
  details: string;
  meetupLabel: string;
  startsAt: Date;
  timeZone: string;
  createdBy: string;
  createdByName: string;
};

export type CircleWalkRsvpSummary = { going: boolean; count: number };

function getPlansReference(circleId: string) {
  return collection(requireFirebase(database, 'Firestore'), 'circles', circleId, 'walkPlans');
}

function readPlan(id: string, value: Record<string, unknown>): CircleWalkPlan | null {
  const startsAt = value.startsAt instanceof Timestamp ? value.startsAt.toDate() : null;
  if (
    typeof value.title !== 'string' || !value.title.trim() || value.title.length > MAX_CIRCLE_WALK_TITLE_LENGTH
    || typeof value.details !== 'string' || value.details.length > MAX_CIRCLE_WALK_DETAILS_LENGTH
    || typeof value.meetupLabel !== 'string' || value.meetupLabel.length > MAX_CIRCLE_WALK_MEETUP_LENGTH
    || !startsAt || !Number.isFinite(startsAt.getTime())
    || typeof value.timeZone !== 'string' || !isValidTimeZone(value.timeZone) || typeof value.createdBy !== 'string'
    || typeof value.createdByName !== 'string' || value.status !== 'scheduled'
  ) return null;

  return { id, title: value.title, details: value.details, meetupLabel: value.meetupLabel, startsAt, timeZone: value.timeZone, createdBy: value.createdBy, createdByName: value.createdByName };
}

export function watchUpcomingCircleWalks(circleId: string, onChange: (plans: CircleWalkPlan[]) => void, onError: () => void): Unsubscribe {
  const currentTime = Timestamp.now();
  const plansQuery = query(getPlansReference(circleId), where('status', '==', 'scheduled'), where('startsAt', '>=', currentTime), orderBy('startsAt'), limit(5));
  return onSnapshot(plansQuery, (snapshot) => {
    const plans = snapshot.docs.flatMap((document) => {
      const plan = readPlan(document.id, document.data());
      return plan ? [plan] : [];
    });
    onChange(plans);
  }, onError);
}

export async function createCircleWalkPlan(input: {
  circleId: string;
  createdBy: string;
  createdByName: string;
  details: string;
  meetupLabel: string;
  startsAt: Date;
  timeZone: string;
  title: string;
}) {
  const title = input.title.trim();
  const details = input.details.trim();
  const meetupLabel = input.meetupLabel.trim();
  if (!title || title.length > MAX_CIRCLE_WALK_TITLE_LENGTH) throw new Error('Add a walk title up to 60 characters.');
  if (details.length > MAX_CIRCLE_WALK_DETAILS_LENGTH || meetupLabel.length > MAX_CIRCLE_WALK_MEETUP_LENGTH) throw new Error('Shorten the walk details and try again.');
  if (input.startsAt.getTime() <= Date.now()) throw new Error('Choose a future time for your walk.');

  const planReference = doc(getPlansReference(input.circleId));
  await setDoc(planReference, {
    createdAt: serverTimestamp(),
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    details,
    meetupLabel,
    schemaVersion: 1,
    startsAt: Timestamp.fromDate(input.startsAt),
    status: 'scheduled',
    timeZone: input.timeZone,
    title,
    updatedAt: serverTimestamp(),
  });
}

function getRsvpReference(circleId: string, walkId: string, userId: string) {
  return doc(requireFirebase(database, 'Firestore'), 'circles', circleId, 'walkPlans', walkId, 'rsvps', userId);
}

export function watchCircleWalkRsvps(circleId: string, walkId: string, userId: string, memberIds: readonly string[], onChange: (summary: CircleWalkRsvpSummary) => void, onError: () => void) {
  const db = requireFirebase(database, 'Firestore');
  const rsvps = query(collection(db, 'circles', circleId, 'walkPlans', walkId, 'rsvps'), limit(20));
  return onSnapshot(rsvps, (snapshot) => onChange({
    count: snapshot.docs.filter((document) => document.data().going === true && memberIds.includes(document.id)).length,
    going: snapshot.docs.some((document) => document.id === userId && document.data().going === true),
  }), onError);
}

export async function setCircleWalkRsvp(input: { circleId: string; walkId: string; userId: string; displayName: string; going: boolean }) {
  const db = requireFirebase(database, 'Firestore');
  const reference = getRsvpReference(input.circleId, input.walkId, input.userId);
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(reference);
    if (!input.going) {
      if (current.exists()) transaction.delete(reference);
      return;
    }
    transaction.set(reference, {
      createdAt: current.data()?.createdAt ?? serverTimestamp(),
      displayName: input.displayName,
      going: true,
      updatedAt: serverTimestamp(),
      userId: input.userId,
    });
  });
}

export async function cancelCircleWalkPlan(circleId: string, walkId: string) {
  const db = requireFirebase(database, 'Firestore');
  await updateDoc(doc(db, 'circles', circleId, 'walkPlans', walkId), { status: 'cancelled', updatedAt: serverTimestamp() });
}
