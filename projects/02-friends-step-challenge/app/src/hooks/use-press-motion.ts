import { useEffect, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { useReducedMotion } from './use-reduced-motion';

/** Animate content only, keeping the control's layout, hit area and ref stable. */
export function usePressMotion(disabled = false) {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    scale.stopAnimation(); scale.setValue(1);
    return () => scale.stopAnimation();
  }, [disabled, reduced, scale]);
  function feedback(pressed: boolean) {
    scale.stopAnimation();
    if (disabled || reduced) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: pressed ? 0.97 : 1, damping: 30, stiffness: 420, mass: 0.7, overshootClamping: true, useNativeDriver: Platform.OS !== 'web', isInteraction: false }).start();
  }
  return { scale, pressIn: () => feedback(true), pressOut: () => feedback(false) };
}
