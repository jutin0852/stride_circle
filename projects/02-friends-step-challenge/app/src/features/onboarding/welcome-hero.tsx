import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { WakaLogo } from '@/components/waka-logo';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { useReduceMotionSetting } from './onboarding-motion';

const LOGO_IN_MS = 320;
const HOLD_MS = 450;
const LIFT_MS = 750;
const RISE_MS = 420;
const HERO_RATIO = 0.52;
const HERO_RADIUS = 44;

/**
 * First-run welcome. It opens as a full blue screen with the WAKA logo, matching the app splash
 * it follows, then the blue lifts into a header and the welcome copy rises in underneath. With
 * Reduce Motion on, the settled layout shows straight away.
 */
export function WelcomeHero({ children, reducedMotion }: { children: React.ReactNode; reducedMotion: boolean }) {
  const { colors } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.round(height * HERO_RATIO);
  const logoWidth = Math.min(width * 0.46, 200);
  // The shared hook reports `true` until the device answers; wait for the real setting so the
  // entrance does not mount already finished. Until then the screen is plain blue, like the splash.
  const setting = useReduceMotionSetting();
  const reduce = reducedMotion === false ? false : setting;
  const [logoIn] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const [ripple] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce === null) return;
    if (reduce) {
      logoIn.setValue(1);
      lift.setValue(1);
      rise.setValue(1);
      ripple.setValue(1);
      return;
    }
    // Height and radius cannot run on the native driver, so the whole sequence stays on JS.
    const animation = Animated.parallel([
      Animated.timing(ripple, { toValue: 1, duration: LOGO_IN_MS + HOLD_MS + 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(logoIn, { toValue: 1, duration: LOGO_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.delay(HOLD_MS),
        Animated.timing(lift, { toValue: 1, duration: LIFT_MS, easing: Easing.bezier(0.75, 0, 0.2, 1), useNativeDriver: false }),
        Animated.timing(rise, { toValue: 1, duration: RISE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [lift, logoIn, reduce, rise, ripple]);

  const radius = lift.interpolate({ inputRange: [0, 1], outputRange: [0, HERO_RADIUS] });
  const logoScale = Animated.multiply(
    logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }),
    lift.interpolate({ inputRange: [0, 1], outputRange: [1.18, 1] }),
  );
  const riseOffset = rise.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={[styles.below, { top: heroHeight, paddingBottom: insets.bottom + spacing.lg }]}>
        <Animated.View style={[styles.copy, { opacity: rise, transform: [{ translateY: riseOffset }] }]}>
          <AppText accessibilityRole="header" variant="displaySmall">Walk more.{'\n'}Keep each other going.</AppText>
          <AppText tone="secondary" variant="body">Small daily walks, shared with a few friends — or kept just for you.</AppText>
        </Animated.View>
        <Animated.View style={[styles.footer, { opacity: rise, transform: [{ translateY: riseOffset }] }]}>{children}</Animated.View>
      </View>
      <Animated.View style={[styles.panel, { backgroundColor: colors.brandAction, borderBottomLeftRadius: radius, borderBottomRightRadius: radius, height: lift.interpolate({ inputRange: [0, 1], outputRange: [height, heroHeight] }), paddingTop: insets.top }]}>
        {reduce === false ? <Animated.View pointerEvents="none" style={[styles.ripple, { width: logoWidth, height: logoWidth, borderRadius: logoWidth / 2, opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] }) }] }]} /> : null}
        <Animated.View accessibilityLabel="Wakà" accessibilityRole="image" accessible style={{ opacity: logoIn, transform: [{ scale: logoScale }] }}>
          <WakaLogo color="#FFFFFF" width={logoWidth} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  panel: { alignItems: 'center', justifyContent: 'center', left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  ripple: { borderColor: '#FFFFFF', borderWidth: 3, position: 'absolute' },
  below: { bottom: 0, justifyContent: 'space-between', left: 0, paddingHorizontal: spacing.xxl, paddingTop: spacing.xxl, position: 'absolute', right: 0 },
  copy: { gap: spacing.md },
  footer: { gap: spacing.sm },
});
