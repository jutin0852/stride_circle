import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getGlobalLeaderboardBoardId } from '@/domain/global-leaderboard';
import { watchGlobalLeaderboard } from './global-leaderboard';

const mock = vi.hoisted(() => ({
  higherCount: 0,
  listeners: new Map<string, { error: unknown; next: unknown }>(),
}));

vi.mock('firebase/firestore', () => ({
  collection: (parent: { path: string }, ...segments: string[]) => ({ path: [parent.path, ...segments].join('/') }),
  doc: (parent: unknown, ...segments: string[]) => {
    const parentPath = typeof parent === 'object' && parent !== null && 'path' in parent
      ? String(parent.path)
      : '';
    return { path: [parentPath, ...segments].filter(Boolean).join('/') };
  },
  getCountFromServer: () => Promise.resolve({ data: () => ({ count: mock.higherCount }) }),
  limit: () => undefined,
  onSnapshot: (reference: { path: string }, next: unknown, error: unknown) => {
    mock.listeners.set(reference.path, { error, next });
    return () => undefined;
  },
  orderBy: () => undefined,
  query: (reference: unknown) => reference,
  where: () => undefined,
}));

vi.mock('@/lib/firebase', () => ({ database: {}, requireFirebase: () => ({}) }));

type SnapshotCallback = (snapshot: unknown) => void;
type ErrorCallback = (error: unknown) => void;

function callListener(path: string, callbackName: 'error' | 'next', value: unknown) {
  const callback = mock.listeners.get(path)?.[callbackName];
  if (typeof callback !== 'function') throw new Error(`Missing ${callbackName} listener for ${path}`);
  (callback as SnapshotCallback | ErrorCallback)(value);
}

describe('watchGlobalLeaderboard', () => {
  beforeEach(() => {
    mock.higherCount = 0;
    mock.listeners.clear();
  });

  it('keeps the ranked list available when supplemental reads fail', () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const boardId = getGlobalLeaderboardBoardId('week');
    const entriesPath = `globalLeaderboards/${boardId}/entries`;

    watchGlobalLeaderboard({ onChange, onError, period: 'week', userId: 'you' });
    callListener(entriesPath, 'next', {
      docs: [{ id: 'walker-1', data: () => ({ displayName: 'Walker One', verifiedSteps: 2400 }) }],
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      entries: [expect.objectContaining({ displayName: 'Walker One', rank: 1, verifiedSteps: 2400 })],
    }));

    callListener(`globalLeaderboards/${boardId}`, 'error', { code: 'permission-denied' });
    callListener(`${entriesPath}/you`, 'error', { code: 'permission-denied' });

    expect(onError).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reports failure of the ranked entries query', () => {
    const onError = vi.fn();
    const boardId = getGlobalLeaderboardBoardId('all-time');
    const entriesPath = `globalLeaderboards/${boardId}/entries`;
    const failure = { code: 'permission-denied' };

    watchGlobalLeaderboard({ onChange: vi.fn(), onError, period: 'all-time', userId: 'you' });
    callListener(entriesPath, 'error', failure);

    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('ranks the list from step totals and the current user from a count', async () => {
    const onChange = vi.fn();
    const boardId = getGlobalLeaderboardBoardId('week');
    const entriesPath = `globalLeaderboards/${boardId}/entries`;
    mock.higherCount = 4;

    watchGlobalLeaderboard({ onChange, onError: vi.fn(), period: 'week', userId: 'you' });
    callListener(entriesPath, 'next', {
      docs: [
        { id: 'walker-1', data: () => ({ displayName: 'Walker One', verifiedSteps: 9000 }) },
        { id: 'walker-2', data: () => ({ displayName: 'Walker Two', verifiedSteps: 9000 }) },
        { id: 'walker-3', data: () => ({ displayName: 'Walker Three', verifiedSteps: 5000 }) },
      ],
    });
    callListener(`${entriesPath}/you`, 'next', { exists: () => true, id: 'you', data: () => ({ displayName: 'You', verifiedSteps: 3000 }) });
    await Promise.resolve();
    await Promise.resolve();

    const latest = onChange.mock.lastCall?.[0];
    expect(latest.entries.map((entry: { rank: number }) => entry.rank)).toEqual([1, 1, 3]);
    expect(latest.currentUser).toEqual(expect.objectContaining({ rank: 5, verifiedSteps: 3000 }));
  });
});
