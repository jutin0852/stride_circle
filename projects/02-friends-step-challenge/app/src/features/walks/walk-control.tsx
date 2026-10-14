import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { controlHeights, radii, spacing } from '@/design-system/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type WalkControlProps = {
  label: string;
  icon: 'walk-outline' | 'pause' | 'play' | 'stop-outline';
  circular?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

/** Motion is scoped to recorder controls, not every button in the app. */
export function WalkControl({ label, icon, circular = false, secondary = false, disabled = false, loading = false, onPress }: WalkControlProps) {
  const colors = useAppColors();
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [reveal] = useState(() => new Animated.Value(1));
  const unavailable = disabled || loading;

  useEffect(() => {
    scale.stopAnimation();
    scale.setValue(1);
    return () => scale.stopAnimation();
  }, [scale, unavailable, reducedMotion]);

  useEffect(() => {
    reveal.stopAnimation();
    if (reducedMotion) { reveal.setValue(1); return; }
    reveal.setValue(0);
    const animation = Animated.timing(reveal, { toValue: 1, duration: 160, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [icon, loading, reducedMotion, reveal]);

  function pressFeedback(pressed: boolean) {
    scale.stopAnimation();
    if (reducedMotion || unavailable) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: pressed ? 0.96 : 1, stiffness: 420, damping: 30, mass: 0.7, overshootClamping: true, useNativeDriver: Platform.OS !== 'web' }).start();
  }

  return <Animated.View style={[circular ? styles.circularWrapper : styles.wrapper, { transform: [{ scale }] }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={circular ? 'Starts recording your walk' : undefined}
      accessibilityState={{ disabled: unavailable, busy: loading }} disabled={unavailable} onPress={onPress}
      onPressIn={() => pressFeedback(true)} onPressOut={() => pressFeedback(false)}
      style={({ pressed }) => [styles.button, circular && styles.circular, {
        backgroundColor: secondary ? 'transparent' : colors.accent,
        borderColor: secondary ? colors.border : colors.accentPressed,
        borderWidth: secondary ? 1 : 2, borderBottomWidth: secondary ? 1 : 4,
      }, unavailable && styles.disabled, pressed && styles.pressed]}>
      <Animated.View pointerEvents="none" style={[styles.content, { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [3, 0] }) }] }]}>
        {loading ? <ActivityIndicator color={secondary ? colors.ink : colors.onAccent} /> : <>
          {!circular ? <AppText variant="button" tone={secondary ? 'primary' : 'onBrand'}>{label.replace(' walk', '')}</AppText> : null}
          <Ionicons name={icon} size={circular ? 27 : 18} color={secondary ? colors.ink : colors.onAccent} />
        </>}
      </Animated.View>
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 0 },
  circularWrapper: { width: 56 },
  button: { minHeight: controlHeights.large, borderRadius: radii.md, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  circular: { width: 56, height: 56, minHeight: 56, borderRadius: 28, paddingHorizontal: 0 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82 },
});
