import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  getDefaultAvatarChoice,
  isAvatarStyle,
} from '@/lib/avatar';
import { database, requireFirebase } from '@/lib/firebase';
import { getGlobalLeaderboardBoardId, type GlobalLeaderboardEntry, type GlobalLeaderboardPeriod } from '@/domain/global-leaderboard';

export type GlobalLeaderboardSnapshot = {
  currentUser: GlobalLeaderboardEntry | null;
  entries: GlobalLeaderboardEntry[];
  generatedAt: Date | null;
};

export function watchGlobalLeaderboard(input: {
  onChange: (snapshot: GlobalLeaderboardSnapshot) => void;
  onError: () => void;
  period: GlobalLeaderboardPeriod;
  userId: string;
}): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  const boardReference = doc(db, 'globalLeaderboards', getGlobalLeaderboardBoardId(input.period));
  const entriesQuery = query(collection(boardReference, 'entries'), orderBy('rank'), limit(50));

  let entries: GlobalLeaderboardEntry[] = [];
  let currentUser: GlobalLeaderboardEntry | null = null;
  let generatedAt: Date | null = null;
  let entriesReady = false;
  let boardReady = false;
  let currentUserReady = false;

  const publish = () => {
    if (!entriesReady || !boardReady || !currentUserReady) return;
    input.onChange({ currentUser, entries, generatedAt });
  };

  const subscriptions: Unsubscribe[] = [
    onSnapshot(entriesQuery, (snapshot) => {
      entries = snapshot.docs.flatMap((entry) => {
        const value = readEntry(entry.id, entry.data());
        return value ? [value] : [];
      });
      entriesReady = true;
      publish();
    }, input.onError),
    onSnapshot(boardReference, (snapshot) => {
      generatedAt = snapshot.exists() ? readDate(snapshot.data()?.generatedAt) : null;
      boardReady = true;
      publish();
    }, input.onError),
    onSnapshot(doc(boardReference, 'entries', input.userId), (snapshot) => {
      currentUser = snapshot.exists() ? readEntry(snapshot.id, snapshot.data()) : null;
      currentUserReady = true;
      publish();
    }, input.onError),
  ];

  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

function readEntry(userId: string, data: Record<string, unknown> | undefined): GlobalLeaderboardEntry | null {
  if (!data || typeof data.verifiedSteps !== 'number' || !Number.isFinite(data.verifiedSteps) || data.verifiedSteps < 0) return null;
  if (typeof data.rank !== 'number' || !Number.isInteger(data.rank) || data.rank < 1) return null;

  const fallback = getDefaultAvatarChoice(userId);
  return {
    avatar: {
      seed: typeof data.avatarSeed === 'string' && data.avatarSeed ? data.avatarSeed : fallback.seed,
      style: isAvatarStyle(data.avatarStyle) ? data.avatarStyle : fallback.style,
    },
    displayName: typeof data.displayName === 'string' && data.displayName.trim() ? data.displayName.trim() : 'Stride Circle member',
    rank: data.rank,
    userId,
    verifiedSteps: Math.floor(data.verifiedSteps),
  };
}

function readDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== 'object' || value === null || !('toDate' in value)) return null;
  const toDate = (value as { toDate?: unknown }).toDate;
  if (typeof toDate !== 'function') return null;
  const date = toDate();
  return date instanceof Date ? date : null;
}
