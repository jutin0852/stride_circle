import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useAppTheme } from '@/design-system/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const VISIBLE_MS = 2800;

/**
 * A short "walk saved" moment shown once, right after a recorded walk is finished. It confirms
 * the save, acknowledges the effort, and gets out of the way on its own.
 */
export function WalkSavedToast({ steps, top }: { steps: number | null; top: number }) {
  const { colors } = useAppTheme();
  const reduced = useReducedMotion();
  const [value] = useState(() => new Animated.Value(0));
  const [gone, setGone] = useState(false);
  const message = steps ? `${steps.toLocaleString()} steps added to your day.` : 'Nice work getting out there.';

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.announceForAccessibility(`Walk saved. ${message}`);
  }, [message]);

  useEffect(() => {
    const show = reduced
      ? Animated.timing(value, { toValue: 1, duration: 0, useNativeDriver: true })
      : Animated.spring(value, { toValue: 1, speed: 14, bounciness: 9, useNativeDriver: true });
    const animation = Animated.sequence([
      show,
      Animated.delay(VISIBLE_MS),
      Animated.timing(value, { toValue: 0, duration: reduced ? 0 : 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished) setGone(true); });
    return () => animation.stop();
  }, [reduced, value]);

  if (gone) return null;
  return <View pointerEvents="none" style={[styles.wrap, { top }]}>
    <Animated.View style={[styles.toast, { backgroundColor: colors.brandAction, borderColor: colors.brandActionPressed, opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
      <View style={[styles.icon, { backgroundColor: colors.canvas }]}><Ionicons color={colors.brandActionPressed} name="checkmark" size={20} /></View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong" tone="onBrand">Walk saved</AppText>
        <AppText variant="bodySmall" tone="onBrand">{message}</AppText>
      </View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', left: 16, position: 'absolute', right: 16, zIndex: 20 },
  toast: { alignItems: 'center', borderBottomWidth: 4, borderRadius: 18, borderWidth: 2, flexDirection: 'row', gap: 12, maxWidth: 420, paddingHorizontal: 14, paddingVertical: 12, width: '100%' },
  icon: { alignItems: 'center', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  copy: { flex: 1, gap: 1 },
});
