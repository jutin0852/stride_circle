import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * The system Reduce Motion setting, or null until it has been read. Use this when guessing
 * would be visible, e.g. the launch splash must not start (or skip) before the answer arrives.
 */
export function useReducedMotionSetting() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    let changed = false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduced(value);
    }).catch(() => {
      if (active && !changed) setReduced(false);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReduced(value);
    });
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

/** Reduce Motion, treated as on until the system answers so nothing animates by mistake. */
export function useReducedMotion() {
  return useReducedMotionSetting() ?? true;
}
