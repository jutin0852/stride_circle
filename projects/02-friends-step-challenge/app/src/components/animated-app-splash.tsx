import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { darkModePalette, palette, semanticColors } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import type { SplashMode } from '@/components/waka-splash/splash-mode';
import { DESIGN_WIDTH, logoSettleScale, printNameForSlot, runnerFootPose, SPLASH_END, TRAIL_SLOT_COUNT, trailPrintPose, type PrintPose } from '@/components/waka-splash/splash-timeline';
import { WAKA_PRINTS, type WakaPrintName } from '@/components/waka-splash/waka-prints';

type AnimatedAppSplashProps = {
  /** null while the mode is being decided: only the plain background shows. */
  mode: SplashMode | null;
  onFinished: () => void;
  reducedMotion: boolean;
};

const AnimatedG = Animated.createAnimatedComponent(G);
const TRAIL_SLOTS = Array.from({ length: TRAIL_SLOT_COUNT }, (_, slot) => slot);
const EXIT_MS = 220;
const SKIP_EXIT_MS = 160;
const SHORT_INTRO_MS = 340;
const SHORT_HOLD_MS = 260;
const REDUCED_MOTION_MS = 180;

/**
 * The Waka launch animation, shown over the app as the native splash hands off.
 *
 * Full (first launch of the day): a runner circles the centre leaving "WA" (left) and "KA"
 * (right) shoe prints; the trail sweeps and gathers into the Waka logo. Short (other launches):
 * the logo settles in and hands off in under a second. Tapping skips either one. The native
 * splash is a plain background in the same colour, so the hand-off is seamless. With Reduce
 * Motion on, the finished logo shows briefly instead.
 */
export function AnimatedAppSplash({ mode, onFinished, reducedMotion }: AnimatedAppSplashProps) {
  const { isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const time = useSharedValue(mode === 'full' && !reducedMotion ? 0 : SPLASH_END);
  const reveal = useSharedValue(mode === 'full' || reducedMotion ? 1 : 0);
  const exit = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const finish = useCallback((delayMs: number, fadeMs: number) => {
    timers.current.push(setTimeout(() => { exit.value = withTiming(0, { duration: fadeMs }); }, delayMs));
    timers.current.push(setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onFinished();
    }, delayMs + fadeMs));
  }, [exit, onFinished]);

  useEffect(() => {
    if (mode === null) return;
    clearTimers();

    if (reducedMotion) {
      time.value = SPLASH_END;
      reveal.value = 1;
      timers.current.push(setTimeout(() => {
        finished.current = true;
        onFinished();
      }, REDUCED_MOTION_MS));
    } else if (mode === 'full') {
      time.value = 0;
      time.value = withTiming(SPLASH_END, { duration: SPLASH_END * 1000, easing: Easing.linear });
      finish(SPLASH_END * 1000, EXIT_MS);
    } else {
      time.value = SPLASH_END;
      reveal.value = 0;
      reveal.value = withTiming(1, { duration: SHORT_INTRO_MS, easing: Easing.out(Easing.cubic) });
      finish(SHORT_INTRO_MS + SHORT_HOLD_MS, EXIT_MS);
    }

    return clearTimers;
  }, [clearTimers, finish, mode, onFinished, reducedMotion, reveal, time]);

  const skip = useCallback(() => {
    if (finished.current || mode === null) return;
    clearTimers();
    finish(0, SKIP_EXIT_MS);
  }, [clearTimers, finish, mode]);

  const background = isDark ? darkModePalette.background : semanticColors.brandAction;
  const ink = isDark ? darkModePalette.primary : palette.white;
  const designScale = Math.min(width / DESIGN_WIDTH, 1.4);

  const screenStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  const markProps = useAnimatedProps(() => ({
    scale: designScale * logoSettleScale(time.value) * (0.92 + 0.08 * reveal.value),
    opacity: reveal.value,
  }));

  return (
    <Animated.View style={[styles.screen, { backgroundColor: background }, screenStyle]}>
      <Pressable accessibilityHint="Skips the intro" accessibilityLabel="Waka loading" accessibilityRole="button" onPress={skip} style={StyleSheet.absoluteFill}>
        {mode === null ? null : (
          <Svg width={width} height={height}>
            <AnimatedG x={width / 2} y={height / 2} animatedProps={markProps}>
              {TRAIL_SLOTS.map((slot) => (
                <ShoePrint key={`trail-${slot}`} name={printNameForSlot(slot)} color={ink} time={time} pose={(t) => {
                  'worklet';
                  return trailPrintPose(t, slot);
                }} />
              ))}
              <ShoePrint name="KA" color={ink} time={time} pose={(t) => {
                'worklet';
                return runnerFootPose(t, 1);
              }} />
              <ShoePrint name="WA" color={ink} time={time} pose={(t) => {
                'worklet';
                return runnerFootPose(t, -1);
              }} />
            </AnimatedG>
          </Svg>
        )}
      </Pressable>
    </Animated.View>
  );
}

type ShoePrintProps = {
  name: WakaPrintName;
  color: string;
  time: SharedValue<number>;
  pose: (t: number) => PrintPose;
};

function ShoePrint({ name, color, time, pose }: ShoePrintProps) {
  const animatedProps = useAnimatedProps(() => {
    const p = pose(time.value);
    return { translateX: p.x, translateY: p.y, rotation: p.rotation, scale: p.scale, opacity: p.opacity };
  });

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Path d={WAKA_PRINTS[name].d} fill={color} fillRule="evenodd" />
    </AnimatedG>
  );
}

const styles = StyleSheet.create({
  screen: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0, zIndex: 100 },
});
