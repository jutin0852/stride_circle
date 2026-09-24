import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { getDefaultAvatarChoice, isAvatarStyle, type AvatarChoice } from '@/lib/avatar';
import { database, requireFirebase } from '@/lib/firebase';

type UserProfile = {
  avatar: AvatarChoice;
  displayName: string;
  status: 'loading' | 'ready' | 'error';
};

function getFallbackProfile(user: User | null): UserProfile {
  const userId = user?.uid ?? 'visitor';
  return {
    avatar: getDefaultAvatarChoice(userId),
    displayName: user?.displayName?.trim() || 'Stride Circle member',
    status: user ? 'loading' : 'ready',
  };
}

function getDisplayName(profileValue: unknown, user: User) {
  const storedName = typeof profileValue === 'string' ? profileValue.trim() : '';
  const authName = user.displayName?.trim() ?? '';
  if (storedName && storedName !== 'Stride Circle member') return storedName;
  return authName || storedName || 'Stride Circle member';
}

export function useUserProfile(user: User | null): UserProfile {
  const fallback = useMemo(() => getFallbackProfile(user), [user]);
  const [profile, setProfile] = useState<UserProfile>(fallback);

  useEffect(() => {
    if (!user) return;

    const db = requireFirebase(database, 'Firestore');
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        const data = snapshot.data();
        const defaultAvatar = getDefaultAvatarChoice(user.uid);
        setProfile({
          avatar: {
            seed: typeof data?.avatarSeed === 'string' ? data.avatarSeed : defaultAvatar.seed,
            style: isAvatarStyle(data?.avatarStyle) ? data.avatarStyle : defaultAvatar.style,
          },
          displayName: getDisplayName(data?.displayName, user),
          status: 'ready',
        });
      },
      () => setProfile({ ...getFallbackProfile(user), status: 'error' }),
    );
  }, [user]);

  return user ? profile : fallback;
}
