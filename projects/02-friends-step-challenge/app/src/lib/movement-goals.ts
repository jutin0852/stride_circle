import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';

export const DEFAULT_DAILY_STEP_GOAL = 6_000;
export const DAILY_STEP_GOAL_PRESETS = [4_000, 6_000, 8_000, 10_000, 12_000] as const;
export const DEFAULT_WEEKLY_STEP_GOAL = DEFAULT_DAILY_STEP_GOAL * 7;
export const WEEKLY_STEP_GOAL_PRESETS = [21_000, 35_000, 42_000, 56_000, 70_000, 84_000, 105_000] as const;

export function isValidDailyStepGoal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1_000 && value <= 100_000;
}

export function isValidWeeklyStepGoal(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 7_000 && value <= 700_000;
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

export async function saveWeeklyStepGoal(input: { goal: number; userId: string }) {
  if (!isValidWeeklyStepGoal(input.goal)) throw new Error('Choose a weekly goal between 7,000 and 700,000 steps.');

  const db = requireFirebase(database, 'Firestore');
  await setDoc(
    doc(db, 'users', input.userId),
    { weeklyStepGoal: input.goal, weeklyGoalUpdatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function watchWeeklyStepGoal(
  userId: string,
  onChange: (goal: number) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      const goal = snapshot.data()?.weeklyStepGoal;
      onChange(isValidWeeklyStepGoal(goal) ? goal : DEFAULT_WEEKLY_STEP_GOAL);
    },
    onError,
  );
}
