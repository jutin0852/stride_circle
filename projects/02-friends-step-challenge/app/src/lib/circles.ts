import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { database, requireFirebase } from '@/lib/firebase';
import { getDateKeyInTimeZone } from '@/domain/dates';
import { getAvatarChoiceFromUrl, getDefaultAvatarChoice, isAvatarStyle, type AvatarStyle } from '@/lib/avatar';
import {
  getDefaultJoinPolicy,
  isCircleJoinPolicy,
  isCircleVisibility,
  isValidCompetitionTimeZone,
  MAX_CIRCLE_MEMBERS,
  type CircleJoinPolicy,
  type CircleRole,
  type CircleVisibility,
} from '@/domain/circles';

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type Circle = {
  activityType: CircleActivityType;
  competitionTimeZone: string;
  description: string;
  discoverableArea: string | null;
  id: string;
  inviteCode: string | null;
  joinPolicy: CircleJoinPolicy;
  memberCount: number;
  name: string;
  ownerId: string;
  visibility: CircleVisibility;
};

export type CircleActivityType = 'walk';

export type CircleSummary = Pick<Circle, 'activityType' | 'id' | 'name'>;

export type PublicCircleSummary = Pick<Circle, 'activityType' | 'competitionTimeZone' | 'discoverableArea' | 'id' | 'joinPolicy' | 'memberCount' | 'name' | 'visibility'>;

export type CircleMember = {
  avatarSeed: string;
  avatarStyle: AvatarStyle;
  displayName: string;
  role: CircleRole;
  userId: string;
};

export type CircleDetails = {
  circle: Circle;
  members: CircleMember[];
};

export type CircleDailySteps = Record<string, number>;

function getMemberData(user: User, role: CircleRole = 'member') {
  const avatar = getAvatarChoiceFromUrl(user.photoURL) ?? getDefaultAvatarChoice(user.uid);
  return {
    avatarSeed: avatar.seed,
    avatarStyle: avatar.style,
    displayName: user.displayName?.trim() || 'Stride Circle member',
    joinedAt: serverTimestamp(),
    role,
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

function getActivityType(): CircleActivityType {
  // Run was supported by the legacy prototype. New product flows are
  // walking-only, so legacy values are safely normalized on read.
  return 'walk';
}

function getVisibility(value: unknown): CircleVisibility {
  return isCircleVisibility(value) ? value : 'private';
}

function getJoinPolicy(value: unknown, visibility: CircleVisibility): CircleJoinPolicy {
  return isCircleJoinPolicy(value) ? value : getDefaultJoinPolicy(visibility);
}

function getCompetitionTimeZone(value: unknown): string {
  return typeof value === 'string' && isValidCompetitionTimeZone(value) ? value : 'UTC';
}

function getMemberCount(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function getDiscoverableArea(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function createCircle(input: {
  activityType: CircleActivityType;
  competitionTimeZone?: string;
  discoverableArea?: string;
  name: string;
  user: User;
  visibility?: CircleVisibility;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Enter a name for your circle.');

  const visibility = input.visibility ?? 'private';
  const joinPolicy = getDefaultJoinPolicy(visibility);
  const discoverableArea = visibility === 'public' ? getDiscoverableArea(input.discoverableArea) : null;
  const competitionTimeZone = input.competitionTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!isValidCompetitionTimeZone(competitionTimeZone)) throw new Error('Choose a valid competition timezone.');

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
        competitionTimeZone,
        createdAt: serverTimestamp(),
        description: '',
        discoverableArea,
        inviteCode: visibility === 'private' ? inviteCode : null,
        joinPolicy,
        memberCount: 1,
        name,
        ownerId: input.user.uid,
        visibility,
      });
      transaction.set(memberReference, getMemberData(input.user, 'owner'));
      transaction.set(membershipReference, {
        activityType: input.activityType,
        circleId: inviteCode,
        circleName: name,
        joinedAt: serverTimestamp(),
        role: 'owner',
      });
      transaction.set(profileReference, { selectedCircleId: inviteCode, updatedAt: serverTimestamp() }, { merge: true });

      return true;
    });

    if (created) return inviteCode;
  }

  throw new Error('We could not create an invite code. Please try again.');
}

/** Updates the circle document and every member's list label in one batch. */
export async function updateCircle(input: { circleId: string; description: string; name: string }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) throw new Error('Enter a name for your circle.');
  if (name.length > 40) throw new Error('Circle names can be up to 40 characters.');
  if (description.length > 140) throw new Error('Descriptions can be up to 140 characters.');

  const db = requireFirebase(database, 'Firestore');
  const circleReference = doc(db, 'circles', input.circleId);
  const membersSnapshot = await getDocs(collection(db, 'circles', input.circleId, 'members'));
  const batch = writeBatch(db);

  batch.update(circleReference, { description, name, updatedAt: serverTimestamp() });
  membersSnapshot.docs.forEach((member) => {
    batch.set(
      getUserMembershipReference(member.id, input.circleId),
      { circleName: name, updatedAt: serverTimestamp() },
      { merge: true },
    );
  });

  await batch.commit();
}

/**
 * Deletes the circle and the membership records that make it visible to
 * members. Historical activity documents are deliberately retained so they
 * cannot be re-written; once the circle document is gone, those records are
 * no longer accessible through the app.
 */
export async function deleteCircle(input: { circleId: string }) {
  const db = requireFirebase(database, 'Firestore');
  const circleReference = doc(db, 'circles', input.circleId);
  const membersSnapshot = await getDocs(collection(db, 'circles', input.circleId, 'members'));

  // Each member needs two deletions (their member record and membership
  // record), plus the circle document. Firestore batches allow 500 writes.
  if (membersSnapshot.size > 249) {
    throw new Error('This circle has too many members to delete from the app right now.');
  }

  const batch = writeBatch(db);

  membersSnapshot.docs.forEach((member) => {
    batch.delete(member.ref);
    batch.delete(getUserMembershipReference(member.id, input.circleId));
  });
  batch.delete(circleReference);

  await batch.commit();
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
    const memberSnapshot = await transaction.get(memberReference);
    if (!circleSnapshot.exists()) throw new Error('That invite code does not match a circle.');

    const circle = circleSnapshot.data();
    const visibility = getVisibility(circle.visibility);
    const joinPolicy = getJoinPolicy(circle.joinPolicy, visibility);
    const memberCount = getMemberCount(circle.memberCount);
    if (visibility !== 'private' || joinPolicy !== 'invite_only') throw new Error('Use public discovery to join this circle.');
    if (memberCount >= MAX_CIRCLE_MEMBERS) throw new Error('This circle is full.');
    if (typeof circle.name !== 'string') throw new Error('This circle cannot be joined right now.');

    transaction.set(memberReference, getMemberData(input.user), { merge: true });
    transaction.set(
      membershipReference,
      {
        activityType: getActivityType(),
        circleId: inviteCode,
        circleName: circle.name,
        joinedAt: serverTimestamp(),
        role: 'member',
      },
      { merge: true },
    );
    if (!memberSnapshot.exists()) {
      const memberCount = getMemberCount(circle.memberCount);
      transaction.update(circleReference, { memberCount: memberCount + 1, updatedAt: serverTimestamp() });
    }
    transaction.set(profileReference, { selectedCircleId: inviteCode, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export async function joinPublicCircle(input: { circleId: string; user: User }) {
  const db = requireFirebase(database, 'Firestore');
  const circleReference = doc(db, 'circles', input.circleId);
  const memberReference = doc(db, 'circles', input.circleId, 'members', input.user.uid);
  const membershipReference = getUserMembershipReference(input.user.uid, input.circleId);
  const profileReference = doc(db, 'users', input.user.uid);

  await runTransaction(db, async (transaction) => {
    const circleSnapshot = await transaction.get(circleReference);
    const memberSnapshot = await transaction.get(memberReference);
    if (!circleSnapshot.exists()) throw new Error('That public circle is no longer available.');

    const circle = circleSnapshot.data();
    const visibility = getVisibility(circle.visibility);
    const joinPolicy = getJoinPolicy(circle.joinPolicy, visibility);
    const memberCount = getMemberCount(circle.memberCount);
    if (visibility !== 'public' || joinPolicy !== 'open') throw new Error('This circle is not open for public joining.');
    if (memberCount >= MAX_CIRCLE_MEMBERS) throw new Error('This circle is full.');
    if (typeof circle.name !== 'string') throw new Error('This circle cannot be joined right now.');

    transaction.set(memberReference, getMemberData(input.user), { merge: true });
    transaction.set(
      membershipReference,
      {
        activityType: getActivityType(),
        circleId: input.circleId,
        circleName: circle.name,
        joinedAt: serverTimestamp(),
        role: 'member',
      },
      { merge: true },
    );
    if (!memberSnapshot.exists()) transaction.update(circleReference, { memberCount: memberCount + 1, updatedAt: serverTimestamp() });
    transaction.set(profileReference, { selectedCircleId: input.circleId, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export function watchPublicCircles(
  onChange: (circles: PublicCircleSummary[]) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    query(collection(db, 'circles'), where('visibility', '==', 'public'), limit(50)),
    (snapshot) => {
      const circles = snapshot.docs.flatMap((circleSnapshot) => {
        const data = circleSnapshot.data();
        const visibility = getVisibility(data.visibility);
        if (visibility !== 'public' || typeof data.name !== 'string') return [];

        return [{
          activityType: getActivityType(),
          competitionTimeZone: getCompetitionTimeZone(data.competitionTimeZone),
          id: circleSnapshot.id,
          joinPolicy: getJoinPolicy(data.joinPolicy, visibility),
          memberCount: getMemberCount(data.memberCount),
          name: data.name,
          discoverableArea: getDiscoverableArea(data.discoverableArea),
          visibility,
        }];
      });
      onChange(circles);
    },
    onError,
  );
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
  const circleReference = doc(db, 'circles', input.circleId);
  const memberReference = doc(db, 'circles', input.circleId, 'members', input.memberId);
  const membershipReference = getUserMembershipReference(input.memberId, input.circleId);

  await runTransaction(db, async (transaction) => {
    const circleSnapshot = await transaction.get(circleReference);
    const memberSnapshot = await transaction.get(memberReference);
    if (!circleSnapshot.exists() || !memberSnapshot.exists()) return;

    const memberCount = getMemberCount(circleSnapshot.data().memberCount);
    transaction.delete(memberReference);
    transaction.delete(membershipReference);
    transaction.update(circleReference, {
      memberCount: Math.max(0, memberCount - 1),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function saveCircleDailySteps(input: {
  circleId: string;
  dateKey?: string;
  steps: number;
  userId: string;
}) {
  const db = requireFirebase(database, 'Firestore');
  const circleSnapshot = await getDoc(doc(db, 'circles', input.circleId));
  if (!circleSnapshot.exists()) throw new Error('This circle is no longer available.');

  const dateKey = input.dateKey ?? getDateKeyInTimeZone(new Date(), getCompetitionTimeZone(circleSnapshot.data().competitionTimeZone));
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
          activityType: getActivityType(),
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
          activityType: getActivityType(),
        competitionTimeZone: getCompetitionTimeZone(data.competitionTimeZone),
        description: typeof data.description === 'string' ? data.description : '',
        discoverableArea: getDiscoverableArea(data.discoverableArea),
        id: circleSnapshot.id,
        inviteCode: typeof data.inviteCode === 'string' ? data.inviteCode : null,
        joinPolicy: getJoinPolicy(data.joinPolicy, getVisibility(data.visibility)),
        memberCount: getMemberCount(data.memberCount),
        name: data.name,
        ownerId: typeof data.ownerId === 'string' ? data.ownerId : '',
        visibility: getVisibility(data.visibility),
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
          role: data.role === 'owner' || data.role === 'moderator' ? data.role : 'member',
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
