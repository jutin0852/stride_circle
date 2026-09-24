import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';

export const DEFAULT_DAILY_STEP_GOAL = 6_000;
export const DAILY_STEP_GOAL_PRESETS = [4_000, 6_000, 8_000, 10_000, 12_000] as const;

export function isValidDailyStepGoal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1_000 && value <= 100_000;
}

export async function saveDailyStepGoal(input: { goal: number; userId: string }) {
  if (!isValidDailyStepGoal(input.goal)) throw new Error('Choose a daily goal between 1,000 and 100,000 steps.');

  const db = requireFirebase(database, 'Firestore');
  await setDoc(
    doc(db, 'users', input.userId),
    { dailyStepGoal: input.goal, goalUpdatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function watchDailyStepGoal(
  userId: string,
  onChange: (goal: number) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      const goal = snapshot.data()?.dailyStepGoal;
      onChange(isValidDailyStepGoal(goal) ? goal : DEFAULT_DAILY_STEP_GOAL);
    },
    onError,
  );
}
