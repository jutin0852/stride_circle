import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  getPrefixEnd,
  getUsernameError,
  mergePeopleResults,
  normalizeSearchTerm,
  normalizeUsername,
  PEOPLE_SEARCH_LIMIT,
  type PublicProfile,
} from '@/domain/usernames';
import { getAvatarChoiceFromUrl, getDefaultAvatarChoice } from '@/lib/avatar';
import { database, requireFirebase } from '@/lib/firebase';
import { joinCircle, joinPublicCircle } from '@/lib/circles';

const INVITE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
const INBOX_LIMIT = 50;
const FRIENDS_LIMIT = 100;

export type CircleInvite = {
  circleId: string;
  circleName: string;
  expiresAt: Date | null;
  id: string;
  inviteeId: string;
  inviterDisplayName: string;
  inviterId: string;
};

export type FriendRequest = {
  fromDisplayName: string;
  fromId: string;
  id: string;
  toId: string;
};

function toDate(value: unknown) {
  return value instanceof Timestamp ? value.toDate() : null;
}

function readPublicProfile(id: string, data: DocumentData | undefined): PublicProfile | null {
  if (!data || typeof data.username !== 'string' || typeof data.displayName !== 'string') return null;
  const fallback = getDefaultAvatarChoice(id);
  return {
    avatarSeed: typeof data.avatarSeed === 'string' ? data.avatarSeed : fallback.seed,
    avatarStyle: typeof data.avatarStyle === 'string' ? data.avatarStyle : fallback.style,
    discoverable: data.discoverable !== false,
    displayName: data.displayName,
    userId: id,
    username: data.username,
    usernameChangedAt: toDate(data.usernameChangedAt),
  };
}

function getDb() {
  return requireFirebase(database, 'Firestore');
}

/** Turns Firestore and Functions errors into something a person can act on. */
export function getPeopleErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'unavailable') return 'You appear to be offline. Check your connection and try again.';
  if (code === 'permission-denied') return 'That is not possible right now.';
  if (error instanceof Error && error.message && !code) return error.message;
  return fallback;
}

// ---------- Public profile and username ----------

export function watchPublicProfile(
  userId: string,
  onChange: (profile: PublicProfile | null) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), 'publicProfiles', userId),
    (snapshot) => onChange(readPublicProfile(snapshot.id, snapshot.data())),
    onError,
  );
}

export async function getPublicProfile(userId: string) {
  const snapshot = await getDoc(doc(getDb(), 'publicProfiles', userId));
  return snapshot.exists() ? readPublicProfile(snapshot.id, snapshot.data()) : null;
}

export async function isUsernameAvailable(username: string) {
  const handle = normalizeUsername(username);
  if (getUsernameError(handle)) return false;
  return !(await getDoc(doc(getDb(), 'usernames', handle))).exists();
}

function assertUsable(handle: string) {
  const problem = getUsernameError(handle);
  if (problem) throw new Error(problem);
}

function getOwnProfileFields(user: User) {
  const avatar = getAvatarChoiceFromUrl(user.photoURL) ?? getDefaultAvatarChoice(user.uid);
  const displayName = user.displayName?.trim() || 'Stride Circle member';
  return { avatarSeed: avatar.seed, avatarStyle: avatar.style, displayName, displayNameLower: displayName.toLowerCase() };
}

/** Claims a handle and creates the searchable profile in one batch, so a handle is never half-claimed. */
export async function claimUsername(input: { discoverable?: boolean; user: User; username: string }) {
  const handle = normalizeUsername(input.username);
  assertUsable(handle);
  const db = getDb();
  if ((await getDoc(doc(db, 'usernames', handle))).exists()) throw new Error('That username is already taken.');

  const batch = writeBatch(db);
  batch.set(doc(db, 'usernames', handle), { createdAt: serverTimestamp(), uid: input.user.uid });
  batch.set(doc(db, 'publicProfiles', input.user.uid), {
    ...getOwnProfileFields(input.user),
    discoverable: input.discoverable ?? true,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    userId: input.user.uid,
    username: handle,
  });
  try {
    await batch.commit();
  } catch (error) {
    if ((await getDoc(doc(db, 'usernames', handle))).exists()) throw new Error('That username is already taken.');
    throw error;
  }
}

/** Moves the claim from the old handle to a new one. Rules allow this once every 30 days. */
export async function changeUsername(input: { currentProfile: PublicProfile; user: User; username: string }) {
  const handle = normalizeUsername(input.username);
  assertUsable(handle);
  if (handle === input.currentProfile.username) return;
  const db = getDb();
  if ((await getDoc(doc(db, 'usernames', handle))).exists()) throw new Error('That username is already taken.');

  const batch = writeBatch(db);
  batch.delete(doc(db, 'usernames', input.currentProfile.username));
  batch.set(doc(db, 'usernames', handle), { createdAt: serverTimestamp(), uid: input.user.uid });
  batch.set(doc(db, 'publicProfiles', input.user.uid), {
    ...getOwnProfileFields(input.user),
    discoverable: input.currentProfile.discoverable,
    schemaVersion: 1,
    updatedAt: serverTimestamp(),
    userId: input.user.uid,
    username: handle,
    usernameChangedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function setDiscoverable(input: { discoverable: boolean; userId: string }) {
  await updateDoc(doc(getDb(), 'publicProfiles', input.userId), {
    discoverable: input.discoverable,
    updatedAt: serverTimestamp(),
  });
}

// ---------- Search ----------

/** Exact handle lookup. Works for people who hid from search, like sharing a code. */
export async function lookupUsername(username: string): Promise<PublicProfile | null> {
  const handle = normalizeUsername(username);
  if (getUsernameError(handle)) return null;
  const claim = await getDoc(doc(getDb(), 'usernames', handle));
  const uid = claim.data()?.uid;
  return typeof uid === 'string' ? getPublicProfile(uid) : null;
}

/**
 * Prefix search over discoverable people, by handle and by display name.
 * Both queries are bounded to PEOPLE_SEARCH_LIMIT and need at least two characters.
 */
export async function searchPeople(input: { blockedIds: ReadonlySet<string>; selfId: string; term: string }): Promise<PublicProfile[]> {
  const term = normalizeSearchTerm(input.term);
  if (!term) return [];
  const profiles = collection(getDb(), 'publicProfiles');
  const run = (field: 'displayNameLower' | 'username') => getDocs(query(
    profiles,
    where('discoverable', '==', true),
    where(field, '>=', term),
    where(field, '<', getPrefixEnd(term)),
    orderBy(field),
    limit(PEOPLE_SEARCH_LIMIT),
  ));

  const [byHandle, byName] = await Promise.all([run('username'), run('displayNameLower')]);
  const read = (snapshot: typeof byHandle) => snapshot.docs.flatMap((entry) => {
    const profile = readPublicProfile(entry.id, entry.data());
    return profile ? [profile] : [];
  });
  return mergePeopleResults([read(byHandle), read(byName)], { blockedIds: input.blockedIds, selfId: input.selfId });
}

// ---------- Circle invites ----------

function readInvite(id: string, data: DocumentData): CircleInvite | null {
  if (typeof data.circleId !== 'string' || typeof data.inviteeId !== 'string' || typeof data.inviterId !== 'string') return null;
  return {
    circleId: data.circleId,
    circleName: typeof data.circleName === 'string' ? data.circleName : 'a circle',
    expiresAt: toDate(data.expiresAt),
    id,
    inviteeId: data.inviteeId,
    inviterDisplayName: typeof data.inviterDisplayName === 'string' ? data.inviterDisplayName : 'Someone',
    inviterId: data.inviterId,
  };
}

function isExpired(invite: CircleInvite, now = Date.now()) {
  return invite.expiresAt !== null && invite.expiresAt.getTime() < now;
}

/** Pending invitations for the signed-in user; expired ones are hidden. */
export function watchMyInvites(userId: string, onChange: (invites: CircleInvite[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'circleInvites'), where('inviteeId', '==', userId), limit(INBOX_LIMIT)),
    (snapshot) => onChange(snapshot.docs.flatMap((entry) => {
      const invite = readInvite(entry.id, entry.data());
      return invite && !isExpired(invite) ? [invite] : [];
    })),
    onError,
  );
}

/** Invites an owner or moderator has pending for one circle. */
export function watchCircleInvites(circleId: string, onChange: (invites: CircleInvite[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'circleInvites'), where('circleId', '==', circleId), limit(20)),
    (snapshot) => onChange(snapshot.docs.flatMap((entry) => {
      const invite = readInvite(entry.id, entry.data());
      return invite && !isExpired(invite) ? [invite] : [];
    })),
    onError,
  );
}

export async function sendCircleInvite(input: { circleId: string; circleName: string; inviteeId: string; inviter: User }) {
  const db = getDb();
  const inviteReference = doc(db, 'circleInvites', `${input.circleId}_${input.inviteeId}`);
  const existing = await getDoc(inviteReference);
  if (existing.exists()) {
    const invite = readInvite(existing.id, existing.data());
    if (invite && !isExpired(invite)) throw new Error('They already have an invitation to this circle.');
    await deleteDoc(inviteReference);
  }

  await setDoc(inviteReference, {
    circleId: input.circleId,
    circleName: input.circleName,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_LIFETIME_MS),
    inviteeId: input.inviteeId,
    inviterDisplayName: input.inviter.displayName?.trim() || 'Stride Circle member',
    inviterId: input.inviter.uid,
    schemaVersion: 1,
  });
}

/** Declines (invitee) or cancels (inviter or moderator) an invitation. */
export async function deleteCircleInvite(invite: Pick<CircleInvite, 'id'>) {
  await deleteDoc(doc(getDb(), 'circleInvites', invite.id));
}

/**
 * Accepting is the person's own join through the same Rules-guarded path as an
 * invite code or Discover (20-member cap, removed members, name matching),
 * after checking the invitation is current and the inviter is not blocked.
 */
export async function acceptCircleInvite(input: { invite: CircleInvite; user: User }) {
  const db = getDb();
  const { invite, user } = input;
  if (invite.inviteeId !== user.uid || isExpired(invite)) throw new Error('This invitation is no longer available.');
  if ((await getDoc(doc(db, 'users', user.uid, 'blocks', invite.inviterId))).exists()) {
    throw new Error('You blocked the person who invited you. Unblock them to accept.');
  }

  const circle = await getDoc(doc(db, 'circles', invite.circleId));
  if (!circle.exists()) throw new Error('This circle no longer exists.');
  if (circle.data().visibility === 'public') await joinPublicCircle({ circleId: invite.circleId, user });
  else await joinCircle({ inviteCode: invite.circleId, user });
  await deleteDoc(doc(db, 'circleInvites', invite.id));
}

// ---------- Friends ----------

function readFriendRequest(id: string, data: DocumentData): FriendRequest | null {
  if (typeof data.fromId !== 'string' || typeof data.toId !== 'string') return null;
  return {
    fromDisplayName: typeof data.fromDisplayName === 'string' ? data.fromDisplayName : 'Someone',
    fromId: data.fromId,
    id,
    toId: data.toId,
  };
}

function watchFriendRequests(field: 'fromId' | 'toId', userId: string, onChange: (requests: FriendRequest[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'friendRequests'), where(field, '==', userId), limit(INBOX_LIMIT)),
    (snapshot) => onChange(snapshot.docs.flatMap((entry) => {
      const request = readFriendRequest(entry.id, entry.data());
      return request ? [request] : [];
    })),
    onError,
  );
}

export const watchIncomingFriendRequests = (userId: string, onChange: (requests: FriendRequest[]) => void, onError: () => void) =>
  watchFriendRequests('toId', userId, onChange, onError);

export const watchOutgoingFriendRequests = (userId: string, onChange: (requests: FriendRequest[]) => void, onError: () => void) =>
  watchFriendRequests('fromId', userId, onChange, onError);

export function watchFriendIds(userId: string, onChange: (ids: string[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(
    query(collection(getDb(), 'users', userId, 'friends'), limit(FRIENDS_LIMIT)),
    (snapshot) => onChange(snapshot.docs.map((entry) => entry.id)),
    onError,
  );
}

/** Creates both sides of the friendship and removes the request in one batch; Rules require the request to exist. */
export async function acceptFriendRequest(input: { fromId: string; userId: string }) {
  const db = getDb();
  const batch = writeBatch(db);
  const fields = { createdAt: serverTimestamp(), schemaVersion: 1 };
  batch.set(doc(db, 'users', input.userId, 'friends', input.fromId), { ...fields, friendId: input.fromId });
  batch.set(doc(db, 'users', input.fromId, 'friends', input.userId), { ...fields, friendId: input.userId });
  batch.delete(doc(db, 'friendRequests', `${input.fromId}_${input.userId}`));
  await batch.commit();
}

/** If they already asked you, accepting is the natural answer, so this accepts instead of sending a second request. */
export async function sendFriendRequest(input: { toId: string; user: User }) {
  const db = getDb();
  const incoming = await getDoc(doc(db, 'friendRequests', `${input.toId}_${input.user.uid}`));
  if (incoming.exists()) {
    await acceptFriendRequest({ fromId: input.toId, userId: input.user.uid });
    return 'accepted' as const;
  }
  await setDoc(doc(db, 'friendRequests', `${input.user.uid}_${input.toId}`), {
    createdAt: serverTimestamp(),
    fromDisplayName: input.user.displayName?.trim() || 'Stride Circle member',
    fromId: input.user.uid,
    schemaVersion: 1,
    toId: input.toId,
  });
  return 'sent' as const;
}

export async function deleteFriendRequest(request: Pick<FriendRequest, 'id'>) {
  await deleteDoc(doc(getDb(), 'friendRequests', request.id));
}

export async function removeFriend(input: { friendId: string; userId: string }) {
  const db = getDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', input.userId, 'friends', input.friendId));
  batch.delete(doc(db, 'users', input.friendId, 'friends', input.userId));
  await batch.commit();
}

/** Blocking ends a friendship and withdraws requests in both directions. Best effort: the block itself matters most. */
export async function clearRelationshipWithBlockedPerson(input: { blockedUserId: string; userId: string }) {
  const db = getDb();
  // Deleting a friend document that does not exist is allowed, so both sides go in one batch.
  await removeFriend({ friendId: input.blockedUserId, userId: input.userId });
  // A request can only be deleted while it exists, so look first.
  await Promise.all([
    doc(db, 'friendRequests', `${input.userId}_${input.blockedUserId}`),
    doc(db, 'friendRequests', `${input.blockedUserId}_${input.userId}`),
  ].map(async (reference) => {
    if ((await getDoc(reference)).exists()) await deleteDoc(reference);
  }));
}
