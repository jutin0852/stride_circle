import { useCallback, useEffect, useMemo, useState } from 'react';

import { watchBlockedPeople, type BlockedPerson } from '@/lib/circle-safety';

type BlockedPeopleState = {
  people: BlockedPerson[];
  status: 'loading' | 'ready' | 'error';
  userId: string | null;
};

export function useBlockedPeople(userId: string | undefined) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<BlockedPeopleState>({ people: [], status: 'loading', userId: null });

  useEffect(() => {
    if (!userId) return;

    let active = true;
    try {
      const unsubscribe = watchBlockedPeople(
        userId,
        (people) => { if (active) setState({ people, status: 'ready', userId }); },
        () => { if (active) setState({ people: [], status: 'error', userId }); },
      );
      return () => { active = false; unsubscribe(); };
    } catch {
      void Promise.resolve().then(() => {
        if (active) setState({ people: [], status: 'error', userId });
      });
      return () => { active = false; };
    }
  }, [revision, userId]);

  const currentState = !userId
    ? { people: [], status: 'ready' as const, userId: undefined }
    : state.userId === userId
      ? state
      : { people: [], status: 'loading' as const, userId };
  const ids = useMemo(() => new Set(currentState.people.map((person) => person.userId)), [currentState.people]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);
  return {
    ids,
    people: currentState.people,
    retry,
    status: currentState.status,
  };
}
