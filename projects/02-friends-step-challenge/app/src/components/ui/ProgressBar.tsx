import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { motion, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type ProgressBarProps = {
  accessibilityLabel?: string;
  animated?: boolean;
  max?: number;
  fillColor?: string;
  trackColor?: string;
  tone?: 'brand' | 'success' | 'coral';
  value: number;
};

export function ProgressBar({ accessibilityLabel = 'Progress', animated = false, fillColor, max = 1, tone = 'brand', trackColor, value }: ProgressBarProps) {
  const { colors } = useAppTheme();
  const fillColors = {
    brand: colors.brandAction,
    success: colors.successContent,
    coral: colors.celebrationSurface,
  };
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="progressbar" accessibilityValue={{ max, min: 0, now: Math.min(Math.max(value, 0), max) }} style={[styles.track, { backgroundColor: trackColor ?? colors.soft }]}>
      {animated ? <AnimatedProgressFill percentage={percentage} color={fillColor ?? fillColors[tone]} /> : <View style={[styles.fill, { backgroundColor: fillColor ?? fillColors[tone], width: `${percentage * 100}%` }]} />}
    </View>
  );
}

function AnimatedProgressFill({ percentage, color }: { percentage: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  // Show stored progress immediately; only subsequent changes need a transition.
  const [progress] = useState(() => new Animated.Value(percentage));
  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion || width === 0) { progress.setValue(percentage); return; }
    const animation = Animated.timing(progress, {
      toValue: percentage, duration: motion.standard, easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web', isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [percentage, progress, reducedMotion, width]);

  // Translate a full-size fill inside the clipped track: no animated layout work.
  return <View testID="progress-animated-track" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.animatedTrack}>
    <Animated.View style={[styles.animatedFill, { backgroundColor: color, opacity: width > 0 ? 1 : 0,
      transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0], extrapolate: 'clamp' }) }],
    }]} />
  </View>;
}

const styles = StyleSheet.create({
  track: { borderRadius: radii.pill, height: spacing.sm, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: radii.pill, height: '100%', minWidth: 4 },
  animatedTrack: { height: '100%', width: '100%', overflow: 'hidden' },
  animatedFill: { borderRadius: radii.pill, height: '100%', width: '100%' },
});
