import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { darkModePalette, semanticColors } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { DESIGN_WIDTH, logoSettleScale, printNameForSlot, runnerFootPose, SPLASH_END, trailPrintPose, type PrintPose } from '@/components/waka-splash/splash-timeline';
import { WAKA_PRINTS, type WakaPrintName } from '@/components/waka-splash/waka-prints';

type AnimatedAppSplashProps = {
  onFinished: () => void;
  reducedMotion: boolean;
};

const AnimatedG = Animated.createAnimatedComponent(G);
const TRAIL_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];
const EXIT_MS = 260;
const REDUCED_MOTION_MS = 180;

/**
 * The Waka launch animation, shown over the app as the native splash hands off.
 *
 * A runner circles the centre, leaving "WA" (left) and "KA" (right) shoe prints; the trail
 * then sweeps around and gathers into the Waka logo. The native splash is a plain background
 * in the same colour, so the hand-off is seamless. With Reduce Motion on, the finished logo
 * shows briefly instead.
 */
export function AnimatedAppSplash({ onFinished, reducedMotion }: AnimatedAppSplashProps) {
  const { isDark } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const time = useSharedValue(reducedMotion ? SPLASH_END : 0);
  const exit = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      time.value = SPLASH_END;
      const timer = setTimeout(onFinished, REDUCED_MOTION_MS);
      return () => clearTimeout(timer);
    }

    time.value = 0;
    time.value = withTiming(SPLASH_END, { duration: SPLASH_END * 1000, easing: Easing.linear });
    const exitTimer = setTimeout(() => { exit.value = withTiming(0, { duration: EXIT_MS }); }, SPLASH_END * 1000);
    const finishTimer = setTimeout(onFinished, SPLASH_END * 1000 + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [exit, onFinished, reducedMotion, time]);

  const background = isDark ? darkModePalette.background : semanticColors.canvas;
  const ink = isDark ? darkModePalette.primary : semanticColors.brandAction;
  const designScale = Math.min(width / DESIGN_WIDTH, 1.4);

  const screenStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  const markProps = useAnimatedProps(() => ({ scale: designScale * logoSettleScale(time.value) }));

  return (
    <Animated.View accessibilityLabel="Waka loading" accessible pointerEvents="none" style={[styles.screen, { backgroundColor: background }, screenStyle]}>
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
