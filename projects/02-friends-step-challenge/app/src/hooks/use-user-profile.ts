import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { getDefaultAvatarChoice, getProfilePhotoURL, isAvatarStyle, type AvatarChoice } from '@/lib/avatar';
import { database, requireFirebase } from '@/lib/firebase';
import { readMediaAsset } from '@/domain/media-storage';

type UserProfile = {
  avatar: AvatarChoice;
  displayName: string;
  status: 'loading' | 'ready' | 'error';
};

function getFallbackProfile(user: User | null): UserProfile {
  const userId = user?.uid ?? 'visitor';
  return {
    avatar: { ...getDefaultAvatarChoice(userId), photoURL: getProfilePhotoURL(user?.photoURL) },
    displayName: user?.displayName?.trim() || 'Wakà member',
    status: user ? 'loading' : 'ready',
  };
}

function getDisplayName(profileValue: unknown, user: User) {
  const storedName = typeof profileValue === 'string' ? profileValue.trim() : '';
  const authName = user.displayName?.trim() ?? '';
  const legacyName = 'Stride Circle member';
  if (storedName && storedName !== legacyName && storedName !== 'Wakà member') return storedName;
  if (authName && authName !== legacyName) return authName;
  return 'Wakà member';
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
            photoAsset: readMediaAsset(data?.photoAsset, user.uid),
            photoURL: getProfilePhotoURL(data?.photoURL ?? user.photoURL),
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
