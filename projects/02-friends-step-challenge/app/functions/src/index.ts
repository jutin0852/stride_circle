import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const db = getFirestore();
const MAX_CIRCLE_MEMBERS = 20;
const GLOBAL_LEADERBOARD_BATCH_SIZE = 450;
const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== 'true';

setGlobalOptions({
  enforceAppCheck,
  maxInstances: 10,
  region: 'us-central1',
});

type ScoreInput = {
  userId: string;
  verifiedSteps: number;
};

function requireUser(request: { auth?: { uid: string } | null }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return request.auth.uid;
}

function getString(data: DocumentData, field: string) {
  const value = data[field];
  return typeof value === 'string' ? value.trim() : '';
}

function getCircleVisibility(value: unknown) {
  return value === 'public' ? 'public' : 'private';
}

function getCircleJoinPolicy(value: unknown, visibility: 'private' | 'public') {
  if (value === 'approval') return 'approval';
  if (value === 'open' && visibility === 'public') return 'open';
  return 'invite_only';
}

function getCompetitionTimeZone(value: unknown) {
  if (typeof value !== 'string' || !value) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return 'UTC';
  }
}

function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDateKeyDaysBefore(date: Date, timeZone: string, daysBefore: number) {
  const [year, month, day] = getDateKeyInTimeZone(date, timeZone).split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day - daysBefore, 12));
  return [shifted.getUTCFullYear(), String(shifted.getUTCMonth() + 1).padStart(2, '0'), String(shifted.getUTCDate()).padStart(2, '0')].join('-');
}

function getWeekStartKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const daysFromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

function rankScores(scores: ScoreInput[]) {
  const ordered = [...scores].sort((first, second) => {
    if (second.verifiedSteps !== first.verifiedSteps) return second.verifiedSteps - first.verifiedSteps;
    return first.userId.localeCompare(second.userId);
  });

  return ordered.map((score, index) => {
    const previous = ordered[index - 1];
    const rank = previous && previous.verifiedSteps === score.verifiedSteps ? index : index + 1;
    return { ...score, isWinner: ordered[0]?.verifiedSteps === score.verifiedSteps, rank };
  });
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export const createCircle = onCall(async (request) => {
  const ownerId = requireUser(request);
  const data = request.data as DocumentData;
  const name = getString(data, 'name');
  if (!name || name.length > 40) throw new HttpsError('invalid-argument', 'Circle name must be 1–40 characters.');

  const visibility = getCircleVisibility(data.visibility);
  const joinPolicy = getCircleJoinPolicy(data.joinPolicy, visibility);
  const competitionTimeZone = getCompetitionTimeZone(data.competitionTimeZone);
  const discoverableArea = visibility === 'public' ? getString(data, 'discoverableArea').slice(0, 60) || null : null;
  const activityType = 'walk';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const circleId = createInviteCode();
    const circleRef = db.doc(`circles/${circleId}`);
    const memberRef = db.doc(`circles/${circleId}/members/${ownerId}`);
    const membershipRef = db.doc(`users/${ownerId}/circleMemberships/${circleId}`);

    const created = await db.runTransaction(async (transaction) => {
      if ((await transaction.get(circleRef)).exists) return false;

      const displayName = typeof request.auth?.token.name === 'string' ? request.auth.token.name : 'Stride Circle member';
      transaction.create(circleRef, {
        activityType,
        competitionTimeZone,
        createdAt: FieldValue.serverTimestamp(),
        description: '',
        discoverableArea,
        inviteCode: visibility === 'private' ? circleId : null,
        joinPolicy,
        memberCount: 1,
        name,
        ownerId,
        schemaVersion: 1,
        visibility,
      });
      transaction.create(memberRef, {
        avatarSeed: ownerId,
        avatarStyle: 'adventurer',
        displayName,
        joinedAt: FieldValue.serverTimestamp(),
        role: 'owner',
        userId: ownerId,
      });
      transaction.create(membershipRef, {
        activityType,
        circleId,
        circleName: name,
        joinedAt: FieldValue.serverTimestamp(),
        role: 'owner',
        schemaVersion: 1,
      });
      return true;
    });

    if (created) return { circleId };
  }

  throw new HttpsError('aborted', 'Could not allocate a circle id. Try again.');
});

export const joinPublicCircle = onCall(async (request) => {
  const userId = requireUser(request);
  const circleId = getString(request.data as DocumentData, 'circleId');
  if (!circleId) throw new HttpsError('invalid-argument', 'Circle id is required.');

  const circleRef = db.doc(`circles/${circleId}`);
  const memberRef = db.doc(`circles/${circleId}/members/${userId}`);
  const membershipRef = db.doc(`users/${userId}/circleMemberships/${circleId}`);
  const profileRef = db.doc(`users/${userId}`);

  await db.runTransaction(async (transaction) => {
    const circleSnapshot = await transaction.get(circleRef);
    const memberSnapshot = await transaction.get(memberRef);
    if (!circleSnapshot.exists) throw new HttpsError('not-found', 'That circle is no longer available.');

    const circle = circleSnapshot.data() ?? {};
    const visibility = getCircleVisibility(circle.visibility);
    const joinPolicy = getCircleJoinPolicy(circle.joinPolicy, visibility);
    const memberCount = typeof circle.memberCount === 'number' ? circle.memberCount : 0;
    if (visibility !== 'public' || joinPolicy !== 'open') throw new HttpsError('failed-precondition', 'This circle is not open to public joining.');
    if (memberCount >= MAX_CIRCLE_MEMBERS && !memberSnapshot.exists) throw new HttpsError('resource-exhausted', 'This circle is full.');
    if (memberSnapshot.exists) return;

    const displayName = typeof request.auth?.token.name === 'string' ? request.auth.token.name : 'Stride Circle member';
    transaction.create(memberRef, {
      avatarSeed: userId,
      avatarStyle: 'adventurer',
      displayName,
      joinedAt: FieldValue.serverTimestamp(),
      role: 'member',
      userId,
    });
    transaction.create(membershipRef, {
      activityType: 'walk',
      circleId,
      circleName: typeof circle.name === 'string' ? circle.name : 'Stride Circle',
      joinedAt: FieldValue.serverTimestamp(),
      role: 'member',
      schemaVersion: 1,
    });
    transaction.update(circleRef, { memberCount: memberCount + 1, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(profileRef, { selectedCircleId: circleId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });

  return { circleId };
});

export const leaveCircle = onCall(async (request) => {
  const userId = requireUser(request);
  const circleId = getString(request.data as DocumentData, 'circleId');
  if (!circleId) throw new HttpsError('invalid-argument', 'Circle id is required.');

  const circleRef = db.doc(`circles/${circleId}`);
  const memberRef = db.doc(`circles/${circleId}/members/${userId}`);
  const membershipRef = db.doc(`users/${userId}/circleMemberships/${circleId}`);
  await db.runTransaction(async (transaction) => {
    const [circleSnapshot, memberSnapshot] = await Promise.all([transaction.get(circleRef), transaction.get(memberRef)]);
    if (!circleSnapshot.exists || !memberSnapshot.exists) return;
    const member = memberSnapshot.data() ?? {};
    if (member.role === 'owner') throw new HttpsError('failed-precondition', 'The owner must delete or transfer the circle before leaving.');

    const circle = circleSnapshot.data() ?? {};
    const memberCount = typeof circle.memberCount === 'number' ? circle.memberCount : 1;
    transaction.delete(memberRef);
    transaction.delete(membershipRef);
    transaction.update(circleRef, { memberCount: Math.max(0, memberCount - 1), updatedAt: FieldValue.serverTimestamp() });
  });

  return { circleId };
});

async function finalizeCircleDay(circleSnapshot: FirebaseFirestore.QueryDocumentSnapshot, dateKey: string) {
  const circle = circleSnapshot.data();
  const dayRef = circleSnapshot.ref.collection('days').doc(dateKey);
  const daySnapshot = await dayRef.get();
  if (daySnapshot.data()?.finalizedAt) return;

  const entries = await circleSnapshot.ref.collection('dailySteps').doc(dateKey).collection('entries').get();
  const scores = rankScores(entries.docs.flatMap((entry) => {
    const data = entry.data();
    if (typeof data.userId !== 'string' || typeof data.steps !== 'number' || !Number.isFinite(data.steps) || data.steps < 0) return [];
    return [{ userId: data.userId, verifiedSteps: Math.floor(data.steps) }];
  }));
  const batch = db.batch();
  scores.forEach((score) => batch.set(dayRef.collection('scores').doc(score.userId), {
    finalizedAt: FieldValue.serverTimestamp(),
    isWinner: score.isWinner,
    rank: score.rank,
    schemaVersion: 1,
    source: 'health-data',
    userId: score.userId,
    verifiedSteps: score.verifiedSteps,
  }, { merge: true }));
  batch.set(dayRef, {
    dateKey,
    finalizedAt: FieldValue.serverTimestamp(),
    schemaVersion: 1,
    winnerUserIds: scores.filter((score) => score.isWinner).map((score) => score.userId),
  }, { merge: true });
  await batch.commit();
}

export const finalizeDailyScores = onSchedule({
  retryCount: 3,
  schedule: '5 * * * *',
  timeZone: 'UTC',
}, async () => {
  const circles = await db.collection('circles').get();
  const date = new Date();
  await Promise.all(circles.docs.map(async (circle) => {
    const timeZone = getCompetitionTimeZone(circle.data().competitionTimeZone);
    await finalizeCircleDay(circle, getDateKeyDaysBefore(date, timeZone, 1));
  }));
});

export const generateWeeklyRecaps = onSchedule({
  retryCount: 3,
  schedule: '20 * * * *',
  timeZone: 'UTC',
}, async () => {
  const circles = await db.collection('circles').get();
  const now = new Date();
  await Promise.all(circles.docs.map(async (circleSnapshot) => {
    const timeZone = getCompetitionTimeZone(circleSnapshot.data().competitionTimeZone);
    const weekKey = getWeekStartKey(getDateKeyDaysBefore(now, timeZone, 7));
    const recapRef = circleSnapshot.ref.collection('weeklyRecaps').doc(weekKey);
    const existing = await recapRef.get();
    if (existing.data()?.generatedAt) return;

    const totals = new Map<string, number>();
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const dateKey = getDateKeyDaysBefore(new Date(`${weekKey}T12:00:00.000Z`), 'UTC', -dayOffset);
      const scores = await circleSnapshot.ref.collection('days').doc(dateKey).collection('scores').get();
      scores.docs.forEach((score) => {
        const data = score.data();
        if (typeof data.userId === 'string' && typeof data.verifiedSteps === 'number') totals.set(data.userId, (totals.get(data.userId) ?? 0) + data.verifiedSteps);
      });
    }
    const ranked = rankScores(Array.from(totals, ([userId, verifiedSteps]) => ({ userId, verifiedSteps })));
    await recapRef.set({
      generatedAt: FieldValue.serverTimestamp(),
      participationCount: ranked.length,
      schemaVersion: 1,
      totalVerifiedSteps: ranked.reduce((total, score) => total + score.verifiedSteps, 0),
      weekKey,
      winnerUserId: ranked[0]?.userId ?? null,
      winnerUserIds: ranked.filter((score) => score.isWinner).map((score) => score.userId),
    }, { merge: true });
  }));
});

type GlobalLeaderboardPeriod = 'week' | 'all-time';

function isDateKey(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T12:00:00.000Z`));
}

function getGlobalLeaderboardBoardId(period: GlobalLeaderboardPeriod, weekKey?: string) {
  return period === 'all-time' ? 'walk_all_time' : `walk_week_${weekKey ?? getWeekStartKey(getDateKeyInTimeZone(new Date(), 'UTC'))}`;
}

function getGlobalProfile(userId: string, data: DocumentData | undefined) {
  if (data?.globalLeaderboardVisible === false) return null;

  return {
    avatarSeed: getString(data ?? {}, 'avatarSeed') || userId,
    avatarStyle: getString(data ?? {}, 'avatarStyle') || 'sprouts',
    displayName: getString(data ?? {}, 'displayName') || 'Stride Circle member',
  };
}

async function commitGlobalLeaderboardOperations(operations: ((batch: FirebaseFirestore.WriteBatch) => void)[]) {
  for (let start = 0; start < operations.length; start += GLOBAL_LEADERBOARD_BATCH_SIZE) {
    const batch = db.batch();
    operations.slice(start, start + GLOBAL_LEADERBOARD_BATCH_SIZE).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

async function writeGlobalLeaderboard(input: {
  period: GlobalLeaderboardPeriod;
  periodKey: string;
  totals: Map<string, number>;
  profiles: Map<string, DocumentData>;
}) {
  const boardId = getGlobalLeaderboardBoardId(input.period, input.periodKey);
  const boardReference = db.doc(`globalLeaderboards/${boardId}`);
  const eligibleScores = Array.from(input.totals, ([userId, verifiedSteps]) => {
    const profile = getGlobalProfile(userId, input.profiles.get(userId));
    if (!profile) return null;
    return { profile, userId, verifiedSteps: Math.floor(verifiedSteps) };
  }).filter((score): score is NonNullable<typeof score> => score !== null && score.verifiedSteps >= 0);
  const ranked = rankScores(eligibleScores.map(({ userId, verifiedSteps }) => ({ userId, verifiedSteps })));
  const profileByUserId = new Map(eligibleScores.map((score) => [score.userId, score.profile]));
  const existingEntries = await boardReference.collection('entries').get();
  const activeUserIds = new Set(ranked.map((score) => score.userId));

  await boardReference.set({
    activityType: 'walk',
    generatedAt: FieldValue.serverTimestamp(),
    participationCount: ranked.length,
    period: input.period,
    periodKey: input.periodKey,
    schemaVersion: 1,
  }, { merge: true });

  const operations: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [];
  ranked.forEach((score) => {
    const profile = profileByUserId.get(score.userId);
    if (!profile) return;
    operations.push((batch) => batch.set(boardReference.collection('entries').doc(score.userId), {
      activityType: 'walk',
      avatarSeed: profile.avatarSeed,
      avatarStyle: profile.avatarStyle,
      displayName: profile.displayName,
      periodKey: input.periodKey,
      rank: score.rank,
      schemaVersion: 1,
      updatedAt: FieldValue.serverTimestamp(),
      userId: score.userId,
      verifiedSteps: score.verifiedSteps,
    }, { merge: true }));
  });
  existingEntries.docs.forEach((entry) => {
    if (!activeUserIds.has(entry.id)) operations.push((batch) => batch.delete(entry.ref));
  });

  await commitGlobalLeaderboardOperations(operations);
}

export const generateGlobalLeaderboards = onSchedule({
  retryCount: 3,
  schedule: '35 * * * *',
  timeZone: 'UTC',
}, async () => {
  const currentUtcDateKey = getDateKeyInTimeZone(new Date(), 'UTC');
  const currentWeekKey = getWeekStartKey(currentUtcDateKey);
  const weeklyTotals = new Map<string, number>();
  const allTimeTotals = new Map<string, number>();
  const dailySteps = await db.collectionGroup('dailySteps').get();

  dailySteps.docs.forEach((document) => {
    const data = document.data();
    const dateKey = isDateKey(data.dateKey) ? data.dateKey : document.id;
    const userReference = document.ref.parent.parent;
    const userId = userReference?.parent.id === 'users' ? userReference.id : undefined;
    const steps = data.steps;
    if (!userId || !isDateKey(dateKey) || dateKey > currentUtcDateKey || typeof steps !== 'number' || !Number.isFinite(steps) || steps < 0) return;

    const total = Math.floor(steps);
    allTimeTotals.set(userId, (allTimeTotals.get(userId) ?? 0) + total);
    if (getWeekStartKey(dateKey) === currentWeekKey) weeklyTotals.set(userId, (weeklyTotals.get(userId) ?? 0) + total);
  });

  const profilesSnapshot = await db.collection('users').get();
  const profiles = new Map(profilesSnapshot.docs.map((profile) => [profile.id, profile.data()]));
  await writeGlobalLeaderboard({ period: 'week', periodKey: currentWeekKey, totals: weeklyTotals, profiles });
  await writeGlobalLeaderboard({ period: 'all-time', periodKey: 'all-time', totals: allTimeTotals, profiles });
});
