import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getWeekStartKey, isDateKey } from './date-keys.js';
import { applyDaySteps, getWeekSteps, readTotals, type LeaderboardTotals } from './leaderboard-totals.js';
import { rankScores } from './ranking.js';

initializeApp();

const db = getFirestore();
const GLOBAL_LEADERBOARD_BATCH_SIZE = 450;

setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1',
});

function getString(data: DocumentData, field: string) {
  const value = data[field];
  return typeof value === 'string' ? value.trim() : '';
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

async function finalizeCircleDay(circleSnapshot: FirebaseFirestore.QueryDocumentSnapshot, dateKey: string) {
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
    const topWalkers = await Promise.all(ranked.slice(0, 3).map(async (score) => {
      const memberSnapshot = await circleSnapshot.ref.collection('members').doc(score.userId).get();
      const displayName = memberSnapshot.data()?.displayName;
      return {
        displayName: typeof displayName === 'string' && displayName.trim() ? displayName : 'Wakà member',
        rank: score.rank,
        userId: score.userId,
        verifiedSteps: score.verifiedSteps,
      };
    }));
    await recapRef.set({
      generatedAt: FieldValue.serverTimestamp(),
      participationCount: ranked.length,
      schemaVersion: 1,
      totalVerifiedSteps: ranked.reduce((total, score) => total + score.verifiedSteps, 0),
      topWalkers,
      weekKey,
      winnerUserId: ranked[0]?.userId ?? null,
      winnerUserIds: ranked.filter((score) => score.isWinner).map((score) => score.userId),
    }, { merge: true });
  }));
});

type GlobalLeaderboardPeriod = 'week' | 'all-time';

const GLOBAL_LEADERBOARD_STATE = 'jobState/globalLeaderboards';
const CHANGED_STEPS_PAGE_SIZE = 1000;
const USER_READ_CHUNK_SIZE = 100;
// Re-read a short overlap so writes committed while the last run was reading
// are not missed. Re-applying a day is idempotent.
const CHANGE_CURSOR_OVERLAP_MS = 5 * 60_000;

function getGlobalLeaderboardBoardId(period: GlobalLeaderboardPeriod, weekKey?: string) {
  return period === 'all-time' ? 'walk_all_time' : `walk_week_${weekKey ?? getWeekStartKey(getDateKeyInTimeZone(new Date(), 'UTC'))}`;
}

function getGlobalProfile(userId: string, data: DocumentData | undefined) {
  if (data?.globalLeaderboardVisible === false) return null;

  return {
    avatarSeed: getString(data ?? {}, 'avatarSeed') || userId,
    avatarStyle: getString(data ?? {}, 'avatarStyle') || 'sprouts',
    photoURL: getString(data ?? {}, 'photoURL') || null,
    displayName: getString(data ?? {}, 'displayName') || 'Wakà member',
  };
}

async function commitGlobalLeaderboardOperations(operations: ((batch: FirebaseFirestore.WriteBatch) => void)[]) {
  for (let start = 0; start < operations.length; start += GLOBAL_LEADERBOARD_BATCH_SIZE) {
    const batch = db.batch();
    operations.slice(start, start + GLOBAL_LEADERBOARD_BATCH_SIZE).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

/** Returns the owning user and validated day for a personal daily-step record. */
function readPersonalDailySteps(document: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = document.data();
  const userReference = document.ref.parent.parent;
  const userId = userReference?.parent.id === 'users' ? userReference.id : undefined;
  const dateKey = isDateKey(data.dateKey) ? data.dateKey : document.id;
  const steps = data.steps;
  if (!userId || !isDateKey(dateKey) || typeof steps !== 'number' || !Number.isFinite(steps) || steps < 0) return null;
  return { dateKey, steps: Math.floor(steps), userId };
}

async function getAllInChunks(references: FirebaseFirestore.DocumentReference[]) {
  const snapshots: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let start = 0; start < references.length; start += USER_READ_CHUNK_SIZE) {
    snapshots.push(...await db.getAll(...references.slice(start, start + USER_READ_CHUNK_SIZE)));
  }
  return snapshots;
}

/**
 * Entries carry totals only. Readers derive ranks from the ordered totals, so
 * one walker's change never forces every entry to be rewritten.
 */
function queueEntryWrites(input: {
  operations: ((batch: FirebaseFirestore.WriteBatch) => void)[];
  profile: ReturnType<typeof getGlobalProfile>;
  totals: LeaderboardTotals;
  userId: string;
  weekKey: string;
}) {
  const boards = [
    { id: getGlobalLeaderboardBoardId('week', input.weekKey), periodKey: input.weekKey, steps: getWeekSteps(input.totals, input.weekKey) },
    { id: getGlobalLeaderboardBoardId('all-time'), periodKey: 'all-time', steps: input.totals.allTimeSteps },
  ];

  boards.forEach((board) => {
    const entryReference = db.doc(`globalLeaderboards/${board.id}/entries/${input.userId}`);
    const profile = input.profile;
    if (!profile || board.steps <= 0) {
      input.operations.push((batch) => batch.delete(entryReference));
      return;
    }
    input.operations.push((batch) => batch.set(entryReference, {
      activityType: 'walk',
      avatarSeed: profile.avatarSeed,
      avatarStyle: profile.avatarStyle,
      photoURL: profile.photoURL,
      displayName: profile.displayName,
      periodKey: board.periodKey,
      schemaVersion: 2,
      updatedAt: FieldValue.serverTimestamp(),
      userId: input.userId,
      verifiedSteps: board.steps,
    }));
  });
}

async function writeBoardHeaders(weekKey: string) {
  const boards = [
    { id: getGlobalLeaderboardBoardId('week', weekKey), period: 'week', periodKey: weekKey },
    { id: getGlobalLeaderboardBoardId('all-time'), period: 'all-time', periodKey: 'all-time' },
  ];
  await Promise.all(boards.map(async (board) => {
    const reference = db.doc(`globalLeaderboards/${board.id}`);
    // A count aggregation costs one read per 1,000 entries.
    const participation = await reference.collection('entries').count().get();
    await reference.set({
      activityType: 'walk',
      generatedAt: FieldValue.serverTimestamp(),
      participationCount: participation.data().count,
      period: board.period,
      periodKey: board.periodKey,
      schemaVersion: 2,
    }, { merge: true });
  }));
}

async function writeUserTotals(input: {
  changesByUser: Map<string, Record<string, number>>;
  // Bootstrap supplies complete all-time sums, so its days are not re-added.
  bootstrapAllTime?: Map<string, number>;
  todayKey: string;
  weekKey: string;
}) {
  const userIds = Array.from(input.changesByUser.keys());
  const [totalsSnapshots, profileSnapshots] = await Promise.all([
    input.bootstrapAllTime ? Promise.resolve([]) : getAllInChunks(userIds.map((userId) => db.doc(`leaderboardTotals/${userId}`))),
    getAllInChunks(userIds.map((userId) => db.doc(`users/${userId}`))),
  ]);
  const storedTotals = new Map(totalsSnapshots.map((snapshot) => [snapshot.id, readTotals(snapshot.data())]));
  const profiles = new Map(profileSnapshots.map((snapshot) => [snapshot.id, snapshot.data()]));
  const operations: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [];

  userIds.forEach((userId) => {
    const changes = input.changesByUser.get(userId) ?? {};
    const totals = input.bootstrapAllTime
      ? { allTimeSteps: input.bootstrapAllTime.get(userId) ?? 0, days: applyDaySteps({ allTimeSteps: 0, days: {} }, changes, input.todayKey).days }
      : applyDaySteps(storedTotals.get(userId) ?? { allTimeSteps: 0, days: {} }, changes, input.todayKey);

    operations.push((batch) => batch.set(db.doc(`leaderboardTotals/${userId}`), { ...totals, schemaVersion: 1, updatedAt: FieldValue.serverTimestamp() }));
    queueEntryWrites({ operations, profile: getGlobalProfile(userId, profiles.get(userId)), totals, userId, weekKey: input.weekKey });
  });

  await commitGlobalLeaderboardOperations(operations);
}

/** First run only: build per-user totals from all history in one pass. */
async function bootstrapGlobalLeaderboards(todayKey: string, weekKey: string) {
  const changesByUser = new Map<string, Record<string, number>>();
  const bootstrapAllTime = new Map<string, number>();
  const dailySteps = await db.collectionGroup('dailySteps').get();

  dailySteps.docs.forEach((document) => {
    const record = readPersonalDailySteps(document);
    if (!record || record.dateKey > todayKey) return;
    bootstrapAllTime.set(record.userId, (bootstrapAllTime.get(record.userId) ?? 0) + record.steps);
    changesByUser.set(record.userId, { ...changesByUser.get(record.userId), [record.dateKey]: record.steps });
  });

  await writeUserTotals({ bootstrapAllTime, changesByUser, todayKey, weekKey });
}

export const generateGlobalLeaderboards = onSchedule({
  retryCount: 3,
  schedule: '35 * * * *',
  timeZone: 'UTC',
}, async () => {
  const runStartedAt = new Date();
  const todayKey = getDateKeyInTimeZone(runStartedAt, 'UTC');
  const weekKey = getWeekStartKey(todayKey);
  const stateReference = db.doc(GLOBAL_LEADERBOARD_STATE);
  const processedThrough = (await stateReference.get()).data()?.processedThrough;
  const cursor = processedThrough instanceof Timestamp ? processedThrough.toDate() : null;

  if (!cursor) {
    await bootstrapGlobalLeaderboards(todayKey, weekKey);
  } else {
    // Only records changed since the last run are read, so cost follows recent
    // walking activity rather than total history.
    const changesByUser = new Map<string, Record<string, number>>();
    const since = new Date(cursor.getTime() - CHANGE_CURSOR_OVERLAP_MS);
    let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    for (;;) {
      let changedQuery = db.collectionGroup('dailySteps').where('updatedAt', '>', since).orderBy('updatedAt').limit(CHANGED_STEPS_PAGE_SIZE);
      if (last) changedQuery = changedQuery.startAfter(last);
      const page = await changedQuery.get();
      page.docs.forEach((document) => {
        const record = readPersonalDailySteps(document);
        if (record) changesByUser.set(record.userId, { ...changesByUser.get(record.userId), [record.dateKey]: record.steps });
      });
      if (page.size < CHANGED_STEPS_PAGE_SIZE) break;
      last = page.docs[page.docs.length - 1];
    }
    await writeUserTotals({ changesByUser, todayKey, weekKey });
  }

  await writeBoardHeaders(weekKey);
  await stateReference.set({ processedThrough: Timestamp.fromDate(runStartedAt), schemaVersion: 1 }, { merge: true });
});
