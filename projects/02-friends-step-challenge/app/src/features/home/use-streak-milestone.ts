import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;

const storageKey = (userId: string) => `waka.streak-milestone-celebrated.${userId}`;

/** The highest milestone a streak has reached, or null below the first one. */
export function reachedMilestone(streak: number) {
  let reached: number | null = null;
  for (const milestone of STREAK_MILESTONES) if (streak >= milestone) reached = milestone;
  return reached;
}

/**
 * Returns a streak milestone to celebrate, once per milestone per person. The last celebrated
 * milestone is kept on the device, so a celebration never repeats after a reload; if a streak
 * breaks and is rebuilt, its milestones can be celebrated again.
 */
export function useStreakMilestone(userId: string | undefined, streak: number | null) {
  const [milestone, setMilestone] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || streak === null) return;
    let active = true;
    const reached = reachedMilestone(streak);
    void AsyncStorage.getItem(storageKey(userId)).then(stored => {
      if (!active) return;
      const celebrated = Number(stored) || 0;
      if (reached === null) {
        // The streak dropped below every milestone: let the next run celebrate them again.
        if (celebrated) void AsyncStorage.removeItem(storageKey(userId)).catch(() => {});
        return;
      }
      if (reached < celebrated) void AsyncStorage.setItem(storageKey(userId), String(reached)).catch(() => {});
      if (reached > celebrated) {
        setMilestone(reached);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [streak, userId]);

  const dismiss = useCallback(() => {
    if (userId && milestone) void AsyncStorage.setItem(storageKey(userId), String(milestone)).catch(() => {});
    setMilestone(null);
  }, [milestone, userId]);

  return { milestone, dismiss };
}
