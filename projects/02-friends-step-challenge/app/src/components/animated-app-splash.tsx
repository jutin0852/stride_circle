import { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design-system/use-app-theme';

type AnimatedAppSplashProps = {
  onFinished: () => void;
  reducedMotion: boolean;
};

/**
 * A short in-app handoff for the native splash screen.
 *
 * The native Expo splash remains responsible for the first frame. This layer
 * only appears once the JS tree is ready, so the animation never delays the
 * platform launch screen or blocks the router from mounting underneath it.
 */
export function AnimatedAppSplash({ onFinished, reducedMotion }: AnimatedAppSplashProps) {
  const { colors } = useAppTheme();
  const intro = useMemo(() => new Animated.Value(0), []);
  const exit = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (reducedMotion) {
      const timer = setTimeout(onFinished, 180);
      return () => clearTimeout(timer);
    }

    const entrance = Animated.parallel([
      Animated.timing(intro, { duration: 620, toValue: 1, useNativeDriver: true }),
    ]);
    entrance.start();

    const finishTimer = setTimeout(() => {
      Animated.timing(exit, { duration: 360, toValue: 0, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onFinished();
      });
    }, 1280);

    return () => {
      entrance.stop();
      clearTimeout(finishTimer);
    };
  }, [exit, intro, onFinished, reducedMotion]);

  const markScale = intro.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.72, 1.06, 1] });
  const markOpacity = intro.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });
  const copyTranslateY = intro.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const copyOpacity = intro.interpolate({ inputRange: [0.35, 0.75], outputRange: [0, 1], extrapolate: 'clamp' });
  const firstStepY = intro.interpolate({ inputRange: [0, 0.3, 1], outputRange: [18, 0, 0] });
  const secondStepY = intro.interpolate({ inputRange: [0, 0.2, 0.52, 1], outputRange: [18, 18, 0, 0] });
  const thirdStepY = intro.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [18, 18, 0, 0] });

  return (
    <Animated.View accessibilityLabel="Stride Circle loading" accessible pointerEvents="none" style={[styles.screen, { backgroundColor: colors.inverse, opacity: exit }]}>
      <View style={[styles.orbit, { borderColor: colors.brandActionSoft }]} />
      <Animated.View style={[styles.content, { opacity: markOpacity, transform: [{ scale: markScale }] }]}>
        <View style={[styles.mark, { backgroundColor: colors.brandActionSoft }]}>
          <Animated.View style={[styles.step, styles.stepOne, { backgroundColor: colors.brandAction, transform: [{ translateY: firstStepY }, { rotate: '-10deg' }] }]} />
          <Animated.View style={[styles.step, styles.stepTwo, { backgroundColor: colors.streakAccent, transform: [{ translateY: secondStepY }, { rotate: '-10deg' }] }]} />
          <Animated.View style={[styles.step, styles.stepThree, { backgroundColor: colors.belowGoalBorder, transform: [{ translateY: thirdStepY }, { rotate: '-10deg' }] }]} />
        </View>
        <Animated.View style={{ opacity: copyOpacity, transform: [{ translateY: copyTranslateY }] }}>
          <Text style={[styles.name, { color: colors.contentInverse }]}>Stride Circle</Text>
          <Text style={[styles.tagline, { color: colors.contentSecondary }]}>Walk together. Go further.</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0, zIndex: 100 },
  orbit: { borderRadius: 120, borderWidth: 1, height: 240, opacity: 0.28, position: 'absolute', width: 240 },
  content: { alignItems: 'center', gap: 22 },
  mark: { borderRadius: 34, height: 108, justifyContent: 'flex-end', overflow: 'hidden', paddingBottom: 20, paddingHorizontal: 20, width: 108 },
  step: { borderRadius: 8, height: 16, position: 'absolute', width: 68 },
  stepOne: { bottom: 20, left: 20 },
  stepTwo: { bottom: 42, left: 28 },
  stepThree: { bottom: 64, left: 36 },
  name: { fontSize: 29, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  tagline: { fontSize: 14, marginTop: 5, textAlign: 'center' },
});
