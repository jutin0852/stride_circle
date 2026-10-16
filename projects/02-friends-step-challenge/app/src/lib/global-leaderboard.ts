import {
  collection,
  doc,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
  where,
} from 'firebase/firestore';

import {
  getDefaultAvatarChoice,
  getProfilePhotoURL,
  isAvatarStyle,
} from '@/lib/avatar';
import { database, requireFirebase } from '@/lib/firebase';
import { getGlobalLeaderboardBoardId, rankByTotals, type GlobalLeaderboardEntry, type GlobalLeaderboardPeriod } from '@/domain/global-leaderboard';

export type GlobalLeaderboardSnapshot = {
  currentUser: GlobalLeaderboardEntry | null;
  entries: GlobalLeaderboardEntry[];
  generatedAt: Date | null;
};

export function watchGlobalLeaderboard(input: {
  onChange: (snapshot: GlobalLeaderboardSnapshot) => void;
  onError: (error: unknown) => void;
  period: GlobalLeaderboardPeriod;
  userId: string;
}): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  const boardReference = doc(db, 'globalLeaderboards', getGlobalLeaderboardBoardId(input.period));
  const entriesReference = collection(boardReference, 'entries');
  // Entries store totals only; ranks are derived here so the server job never
  // rewrites every entry when one walker moves.
  const entriesQuery = query(entriesReference, orderBy('verifiedSteps', 'desc'), limit(50));

  let entries: GlobalLeaderboardEntry[] = [];
  let currentUser: GlobalLeaderboardEntry | null = null;
  let currentUserRead = 0;
  let stopped = false;
  let generatedAt: Date | null = null;
  let entriesReady = false;

  const publish = () => {
    if (!entriesReady) return;
    input.onChange({ currentUser, entries, generatedAt });
  };

  const subscriptions: Unsubscribe[] = [
    onSnapshot(entriesQuery, (snapshot) => {
      entries = rankByTotals(snapshot.docs.flatMap((entry) => {
        const value = readEntry(entry.id, entry.data());
        return value ? [value] : [];
      }));
      entriesReady = true;
      publish();
    }, input.onError),
    onSnapshot(boardReference, (snapshot) => {
      generatedAt = snapshot.exists() ? readDate(snapshot.data()?.generatedAt) : null;
      publish();
    }, () => undefined),
    onSnapshot(doc(boardReference, 'entries', input.userId), (snapshot) => {
      const entry = snapshot.exists() ? readEntry(snapshot.id, snapshot.data()) : null;
      const read = ++currentUserRead;
      if (!entry) {
        currentUser = null;
        publish();
        return;
      }
      // Rank = walkers with strictly more steps + 1. A count aggregation costs
      // one read per 1,000 matching entries.
      void getCountFromServer(query(entriesReference, where('verifiedSteps', '>', entry.verifiedSteps)))
        .then((result) => {
          if (stopped || read !== currentUserRead) return;
          currentUser = { ...entry, rank: result.data().count + 1 };
          publish();
        }, () => undefined);
    }, () => undefined),
  ];

  return () => {
    stopped = true;
    subscriptions.forEach((unsubscribe) => unsubscribe());
  };
}

function readEntry(userId: string, data: Record<string, unknown> | undefined): Omit<GlobalLeaderboardEntry, 'rank'> | null {
  if (!data || typeof data.verifiedSteps !== 'number' || !Number.isFinite(data.verifiedSteps) || data.verifiedSteps < 0) return null;

  const fallback = getDefaultAvatarChoice(userId);
  return {
    avatar: {
      photoURL: getProfilePhotoURL(data.photoURL),
      seed: typeof data.avatarSeed === 'string' && data.avatarSeed ? data.avatarSeed : fallback.seed,
      style: isAvatarStyle(data.avatarStyle) ? data.avatarStyle : fallback.style,
    },
    displayName: typeof data.displayName === 'string' && data.displayName.trim() ? data.displayName.trim() : 'Wakà member',
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
