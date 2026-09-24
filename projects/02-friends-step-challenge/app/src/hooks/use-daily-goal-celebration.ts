import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

type DailyGoalCelebrationInput = {
  dateKey: string;
  goalMet: boolean;
  userId: string | undefined;
};

function getCelebrationKey(userId: string, dateKey: string) {
  return `stride:daily-goal-celebration:${userId}:${dateKey}`;
}

/**
 * Shows the daily goal moment only once per person per local day. The marker
 * is local because it records a viewed celebration, not product data.
 */
export function useDailyGoalCelebration(input: DailyGoalCelebrationInput) {
  const [isVisible, setIsVisible] = useState(false);
  const checkedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!input.userId || !input.goalMet) return;

    const key = getCelebrationKey(input.userId, input.dateKey);
    if (checkedKeyRef.current === key) return;

    let cancelled = false;
    checkedKeyRef.current = key;

    void AsyncStorage.getItem(key)
      .then((hasCelebrated) => {
        if (cancelled || hasCelebrated) return;

        setIsVisible(true);
        return AsyncStorage.setItem(key, 'shown');
      })
      .catch(() => {
        if (!cancelled) setIsVisible(true);
      });

    return () => {
      cancelled = true;
    };
  }, [input.dateKey, input.goalMet, input.userId]);

  return { dismiss: () => setIsVisible(false), isVisible };
}
