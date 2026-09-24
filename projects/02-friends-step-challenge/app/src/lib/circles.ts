import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { database, requireFirebase } from '@/lib/firebase';
import { getLocalDateKey } from '@/lib/daily-steps';
import { getAvatarChoiceFromUrl, getDefaultAvatarChoice, isAvatarStyle, type AvatarStyle } from '@/lib/avatar';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type Circle = {
  activityType: CircleActivityType;
  id: string;
  inviteCode: string;
  name: string;
  ownerId: string;
};

export type CircleActivityType = 'walk' | 'run';

export type CircleSummary = Pick<Circle, 'activityType' | 'id' | 'name'>;

export type CircleMember = {
  avatarSeed: string;
  avatarStyle: AvatarStyle;
  displayName: string;
  userId: string;
};

export type CircleDetails = {
  circle: Circle;
  members: CircleMember[];
};

export type CircleDailySteps = Record<string, number>;

function getMemberData(user: User) {
  const avatar = getAvatarChoiceFromUrl(user.photoURL) ?? getDefaultAvatarChoice(user.uid);
  return {
    avatarSeed: avatar.seed,
    avatarStyle: avatar.style,
    displayName: user.displayName?.trim() || 'Stride Circle member',
    joinedAt: serverTimestamp(),
    userId: user.uid,
  };
}

function getUserMembershipReference(userId: string, circleId: string) {
  const db = requireFirebase(database, 'Firestore');
  return doc(db, 'users', userId, 'circleMemberships', circleId);
}

function generateInviteCode() {
  return Array.from({ length: 8 }, () => {
    const index = Math.floor(Math.random() * INVITE_ALPHABET.length);
    return INVITE_ALPHABET[index];
  }).join('');
}

function normaliseInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/\s/g, '');
}

function getActivityType(value: unknown): CircleActivityType {
  return value === 'run' ? 'run' : 'walk';
}

export async function createCircle(input: { activityType: CircleActivityType; name: string; user: User }) {
  const name = input.name.trim();
  if (!name) throw new Error('Enter a name for your circle.');

  const db = requireFirebase(database, 'Firestore');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const circleReference = doc(db, 'circles', inviteCode);
    const memberReference = doc(db, 'circles', inviteCode, 'members', input.user.uid);
    const membershipReference = getUserMembershipReference(input.user.uid, inviteCode);
    const profileReference = doc(db, 'users', input.user.uid);

    const created = await runTransaction(db, async (transaction) => {
      const existingCircle = await transaction.get(circleReference);
      if (existingCircle.exists()) return false;

      transaction.set(circleReference, {
        activityType: input.activityType,
        createdAt: serverTimestamp(),
        inviteCode,
        name,
        ownerId: input.user.uid,
      });
      transaction.set(memberReference, getMemberData(input.user));
      transaction.set(membershipReference, {
        activityType: input.activityType,
        circleId: inviteCode,
        circleName: name,
        joinedAt: serverTimestamp(),
      });
      transaction.set(profileReference, { selectedCircleId: inviteCode, updatedAt: serverTimestamp() }, { merge: true });

      return true;
    });

    if (created) return inviteCode;
  }

  throw new Error('We could not create an invite code. Please try again.');
}

export async function joinCircle(input: { inviteCode: string; user: User }) {
  const inviteCode = normaliseInviteCode(input.inviteCode);
  if (!inviteCode) throw new Error('Enter an invite code.');

  const db = requireFirebase(database, 'Firestore');
  const circleReference = doc(db, 'circles', inviteCode);
  const memberReference = doc(db, 'circles', inviteCode, 'members', input.user.uid);
  const membershipReference = getUserMembershipReference(input.user.uid, inviteCode);
  const profileReference = doc(db, 'users', input.user.uid);

  await runTransaction(db, async (transaction) => {
    const circleSnapshot = await transaction.get(circleReference);
    if (!circleSnapshot.exists()) throw new Error('That invite code does not match a circle.');

    const circle = circleSnapshot.data();
    if (typeof circle.name !== 'string') throw new Error('This circle cannot be joined right now.');

    transaction.set(memberReference, getMemberData(input.user), { merge: true });
    transaction.set(
      membershipReference,
      {
        activityType: getActivityType(circle.activityType),
        circleId: inviteCode,
        circleName: circle.name,
        joinedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(profileReference, { selectedCircleId: inviteCode, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function selectCircle(input: { circleId: string; userId: string }) {
  const db = requireFirebase(database, 'Firestore');

  await setDoc(
    doc(db, 'users', input.userId),
    { selectedCircleId: input.circleId, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Removes a member's two membership records together. The Firestore rules
 * decide who may call this: a member may leave their own circle, and a
 * circle owner may remove someone else. We intentionally retain their old
 * step entries so past leaderboards remain historically accurate.
 */
export async function removeCircleMember(input: { circleId: string; memberId: string }) {
  const db = requireFirebase(database, 'Firestore');
  const batch = writeBatch(db);

  batch.delete(doc(db, 'circles', input.circleId, 'members', input.memberId));
  batch.delete(getUserMembershipReference(input.memberId, input.circleId));

  await batch.commit();
}

export async function saveCircleDailySteps(input: {
  circleId: string;
  steps: number;
  userId: string;
}) {
  const db = requireFirebase(database, 'Firestore');
  const dateKey = getLocalDateKey();
  const entryReference = doc(
    db,
    'circles',
    input.circleId,
    'dailySteps',
    dateKey,
    'entries',
    input.userId,
  );

  await setDoc(
    entryReference,
    {
      dateKey,
      steps: input.steps,
      updatedAt: serverTimestamp(),
      userId: input.userId,
    },
    { merge: true },
  );
}

export function watchCircleDailySteps(
  circleId: string,
  dateKey: string,
  onChange: (steps: CircleDailySteps) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');

  return onSnapshot(
    collection(db, 'circles', circleId, 'dailySteps', dateKey, 'entries'),
    (snapshot) => {
      const steps = snapshot.docs.reduce<CircleDailySteps>((result, entry) => {
        const data = entry.data();
        if (typeof data.userId === 'string' && typeof data.steps === 'number') {
          result[data.userId] = data.steps;
        }
        return result;
      }, {});

      onChange(steps);
    },
    onError,
  );
}

export function watchUserCircles(
  userId: string,
  onChange: (circles: CircleSummary[], selectedCircleId: string | null) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  let memberships: CircleSummary[] = [];
  let selectedCircleId: string | null = null;

  function publish() {
    const selected = memberships.some((circle) => circle.id === selectedCircleId)
      ? selectedCircleId
      : memberships[0]?.id ?? null;
    onChange(memberships, selected);
  }

  const stopProfile = onSnapshot(
    doc(db, 'users', userId),
    (profileSnapshot) => {
      const profile = profileSnapshot.data();
      selectedCircleId = typeof profile?.selectedCircleId === 'string' ? profile.selectedCircleId : null;
      publish();
    },
    onError,
  );
  const stopMemberships = onSnapshot(
    collection(db, 'users', userId, 'circleMemberships'),
    (membershipSnapshot) => {
      memberships = membershipSnapshot.docs.flatMap((membership) => {
        const data = membership.data();
        if (typeof data.circleName !== 'string') return [];

        return [{
          activityType: getActivityType(data.activityType),
          id: membership.id,
          name: data.circleName,
        }];
      });
      publish();
    },
    onError,
  );

  return () => {
    stopProfile();
    stopMemberships();
  };
}

export function watchCircleDetails(
  circleId: string | undefined,
  onChange: (details: CircleDetails | null) => void,
  onError: () => void,
): Unsubscribe | undefined {
  if (!circleId) {
    onChange(null);
    return undefined;
  }

  const db = requireFirebase(database, 'Firestore');
  let circle: Circle | null = null;
  let members: CircleMember[] | null = null;

  function publish() {
    if (circle && members) onChange({ circle, members });
  }

  const stopCircle = onSnapshot(
    doc(db, 'circles', circleId),
    (circleSnapshot) => {
      const data = circleSnapshot.data();
      if (!circleSnapshot.exists() || typeof data?.name !== 'string') {
        onChange(null);
        return;
      }

      circle = {
        activityType: getActivityType(data.activityType),
        id: circleSnapshot.id,
        inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : circleSnapshot.id,
        name: data.name,
        ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
      };
      publish();
    },
    onError,
  );
  const stopMembers = onSnapshot(
    collection(db, 'circles', circleId, 'members'),
    (membersSnapshot) => {
      members = membersSnapshot.docs.flatMap((member) => {
        const data = member.data();
        if (typeof data.displayName !== 'string' || typeof data.userId !== 'string') return [];
        const fallbackAvatar = getDefaultAvatarChoice(data.userId);
        return [{
          avatarSeed: typeof data.avatarSeed === 'string' ? data.avatarSeed : fallbackAvatar.seed,
          avatarStyle: isAvatarStyle(data.avatarStyle) ? data.avatarStyle : fallbackAvatar.style,
          displayName: data.displayName,
          userId: data.userId,
        }];
      });
      publish();
    },
    onError,
  );

  return () => {
    stopCircle();
    stopMembers();
  };
}
