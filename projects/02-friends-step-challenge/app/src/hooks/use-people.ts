import { useEffect, useState } from 'react';
import type { Unsubscribe } from 'firebase/firestore';

import type { PublicProfile } from '@/domain/usernames';
import {
  getPublicProfile,
  watchFriendIds,
  watchIncomingFriendRequests,
  watchMyInvites,
  watchOutgoingFriendRequests,
  watchPublicProfile,
  type CircleInvite,
  type FriendRequest,
} from '@/lib/people';

type Watched<T> = { status: 'error' | 'loading' | 'ready'; userId: string | null; value: T };

/** Subscribes while a user is signed in. State is keyed by user so a previous user's data never shows. */
function useWatched<T>(
  userId: string | undefined,
  empty: T,
  subscribe: (userId: string, onChange: (value: T) => void, onError: () => void) => Unsubscribe,
) {
  const [state, setState] = useState<Watched<T>>({ status: 'loading', userId: null, value: empty });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    try {
      const unsubscribe = subscribe(
        userId,
        (value) => { if (active) setState({ status: 'ready', userId, value }); },
        () => { if (active) setState({ status: 'error', userId, value: empty }); },
      );
      return () => { active = false; unsubscribe(); };
    } catch {
      void Promise.resolve().then(() => { if (active) setState({ status: 'error', userId, value: empty }); });
      return () => { active = false; };
    }
    // subscribe and empty are module-level constants at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return { status: 'ready' as const, value: empty };
  return state.userId === userId ? { status: state.status, value: state.value } : { status: 'loading' as const, value: empty };
}

const NO_PROFILE: PublicProfile | null = null;
const NO_INVITES: CircleInvite[] = [];
const NO_REQUESTS: FriendRequest[] = [];
const NO_IDS: string[] = [];

/** The signed-in user's searchable profile, or null when they have not picked a username yet. */
export function usePublicProfile(userId: string | undefined) {
  return useWatched<PublicProfile | null>(userId, NO_PROFILE, watchPublicProfile);
}

export function useCircleInvites(userId: string | undefined) {
  return useWatched<CircleInvite[]>(userId, NO_INVITES, watchMyInvites);
}

export function useFriends(userId: string | undefined) {
  const ids = useWatched<string[]>(userId, NO_IDS, watchFriendIds);
  const incoming = useWatched<FriendRequest[]>(userId, NO_REQUESTS, watchIncomingFriendRequests);
  const outgoing = useWatched<FriendRequest[]>(userId, NO_REQUESTS, watchOutgoingFriendRequests);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile | null>>({});

  const idKey = ids.value.join(',');
  useEffect(() => {
    let active = true;
    ids.value.filter((id) => !(id in profiles)).forEach((id) => {
      getPublicProfile(id)
        .then((profile) => { if (active) setProfiles((current) => ({ ...current, [id]: profile })); })
        .catch(() => { if (active) setProfiles((current) => ({ ...current, [id]: null })); });
    });
    return () => { active = false; };
    // Only the set of friend ids should trigger loading; profiles is read to skip cached ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  const friends = ids.value.flatMap((id) => (profiles[id] ? [profiles[id]] : []));
  return {
    friendIds: ids.value,
    friends,
    incoming: incoming.value,
    outgoing: outgoing.value,
    status: ids.status === 'error' || incoming.status === 'error' || outgoing.status === 'error'
      ? ('error' as const)
      : ids.status === 'loading' || incoming.status === 'loading' || outgoing.status === 'loading' ? ('loading' as const) : ('ready' as const),
  };
}

/** Circle invitations plus incoming friend requests, for the Circles tab badge. */
export function usePendingPeopleCount(userId: string | undefined) {
  const invites = useWatched<CircleInvite[]>(userId, NO_INVITES, watchMyInvites);
  const requests = useWatched<FriendRequest[]>(userId, NO_REQUESTS, watchIncomingFriendRequests);
  return invites.value.length + requests.value.length;
}
