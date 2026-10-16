import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';

export const ONBOARDING_VERSION = 1;

export type OnboardingIntent = 'build-a-rhythm' | 'walk-with-friends' | 'feel-better' | 'see-my-progress';

export function needsOnboarding(profile: Record<string, unknown> | undefined) {
  // Profiles made before this flow intentionally have no field. Treating them
  // as complete protects existing members from a surprise setup interruption.
  return profile?.onboardingVersion === 0;
}

export function watchOnboarding(
  userId: string,
  onChange: (needsSetup: boolean) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => onChange(needsOnboarding(snapshot.data())),
    onError,
  );
}

export async function completeOnboarding(input: { intent: OnboardingIntent; userId: string }) {
  const db = requireFirebase(database, 'Firestore');
  await setDoc(
    doc(db, 'users', input.userId),
    {
      onboardingCompletedAt: serverTimestamp(),
      onboardingIntent: input.intent,
      onboardingVersion: ONBOARDING_VERSION,
    },
    { merge: true },
  );
}

/** Development-only caller: lets the current tester walk through setup again. */
export async function restartOnboardingForTesting(userId: string) {
  const db = requireFirebase(database, 'Firestore');
  await setDoc(
    doc(db, 'users', userId),
    { onboardingVersion: 0 },
    { merge: true },
  );
}
