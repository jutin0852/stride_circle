import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedHomeMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

/** Celebrate a live crossing only; opening with a completed/cached goal is quiet. */
export function useHomeGoalEvent(userId: string | undefined, dateKey: string, steps: number | null, goal: number | null, confirmed: boolean) {
  const previous = useRef<{ key: string; steps: number; goal: number } | null>(null);
  const [event, setEvent] = useState(0);
  useEffect(() => {
    let active = true;
    const key = `${userId ?? ''}:${dateKey}`;
    if (!confirmed || steps === null || goal === null || !userId) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    previous.current = { key, steps, goal };
    if (before?.key !== key || before.goal !== goal || before.steps >= goal || steps < goal) return;
    const storageKey = `stride:daily-goal-celebration:${key}`;
    void (async () => {
      if (await AsyncStorage.getItem(storageKey)) return;
      await AsyncStorage.setItem(storageKey, 'shown');
      if (active) setEvent((value) => value + 1);
    })().catch(() => {});
    return () => { active = false; };
  }, [confirmed, dateKey, goal, steps, userId]);
  return event;
}
