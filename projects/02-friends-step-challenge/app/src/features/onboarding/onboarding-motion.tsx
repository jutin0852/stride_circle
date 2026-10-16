import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const NATIVE = Platform.OS !== 'web';
const SPRING_EASE = Easing.bezier(0.3, 1.4, 0.5, 1);

/**
 * The device's Reduce Motion setting, or null until it is known. The shared hook starts at
 * `true`, which is right for most screens but makes a one-shot entrance mount already finished.
 */
export function useReduceMotionSetting() {
  const [setting, setSetting] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setSetting(value); }).catch(() => { if (active) setSetting(true); });
    return () => { active = false; };
  }, []);
  return setting;
}

/** Content arrives by rising 18 px and fading in, after an optional stagger delay. */
export function Rise({ children, delay = 0, reducedMotion, style }: { children: React.ReactNode; delay?: number; reducedMotion: boolean; style?: StyleProp<ViewStyle> }) {
  const [value] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  useEffect(() => {
    if (reducedMotion) { value.setValue(1); return; }
    const animation = Animated.timing(value, { toValue: 1, delay, duration: 460, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: NATIVE });
    animation.start();
    return () => animation.stop();
  }, [delay, reducedMotion, value]);
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>{children}</Animated.View>;
}

/** Overshoots slightly and settles. Give it a new `key` to replay, e.g. when a selection changes. */
export function PopIn({ children, delay = 0, reducedMotion, style }: { children: React.ReactNode; delay?: number; reducedMotion: boolean; style?: StyleProp<ViewStyle> }) {
  const [value] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  useEffect(() => {
    if (reducedMotion) { value.setValue(1); return; }
    const animation = Animated.timing(value, { toValue: 1, delay, duration: 520, easing: SPRING_EASE, useNativeDriver: NATIVE });
    animation.start();
    return () => animation.stop();
  }, [delay, reducedMotion, value]);
  return <Animated.View style={[style, { opacity: value.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>{children}</Animated.View>;
}

/** Two soft rings that keep pulsing out from behind an icon while we wait on the person. */
export function PulseRings({ color, reducedMotion, size }: { color: string; reducedMotion: boolean; size: number }) {
  const [a] = useState(() => new Animated.Value(0));
  const [b] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reducedMotion) return;
    const loop = (value: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 2000, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }),
      Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: NATIVE }),
    ]));
    const first = loop(a, 0);
    const second = loop(b, 1000);
    first.start();
    second.start();
    return () => { first.stop(); second.stop(); };
  }, [a, b, reducedMotion]);
  if (reducedMotion) return null;
  return <>{[a, b].map((value, index) => <Animated.View key={index} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }), transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }] }} />
  </Animated.View>)}</>;
}

const CONFETTI_COLORS = ['#F77768', '#FFD34E', '#13B5E8', '#317F1B', '#087CA5', '#FFB4A6'];
const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  angle: index * 20 + (index % 3) * 7,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  distance: [150, 200, 120][index % 3],
  spin: [320, -280, 420][index % 3],
  round: index % 2 === 0,
  delay: 120 + (index % 4) * 60,
}));

/** A one-time burst from the centre of its box, for the end of setup. */
export function ConfettiBurst({ reducedMotion }: { reducedMotion: boolean }) {
  const [values] = useState(() => CONFETTI.map(() => new Animated.Value(0)));
  useEffect(() => {
    if (reducedMotion) return;
    const animation = Animated.parallel(values.map((value, index) => Animated.timing(value, { toValue: 1, delay: CONFETTI[index].delay, duration: 1400, easing: Easing.bezier(0.15, 0.7, 0.3, 1), useNativeDriver: NATIVE })));
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, values]);
  if (reducedMotion) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
    {CONFETTI.map((piece, index) => <View key={index} style={[styles.origin, { transform: [{ rotate: `${piece.angle}deg` }] }]}>
      <Animated.View style={{
        width: piece.round ? 10 : 8, height: piece.round ? 10 : 14, borderRadius: piece.round ? 5 : 2, backgroundColor: piece.color,
        opacity: values[index].interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: values[index].interpolate({ inputRange: [0, 1], outputRange: [0, -piece.distance] }) },
          { rotate: values[index].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] }) },
          { scale: values[index].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
        ],
      }} />
    </View>)}
  </View>;
}

/** A happy hop, three times, for the finish badge. */
export function Hop({ children, reducedMotion }: { children: React.ReactNode; reducedMotion: boolean }) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reducedMotion) return;
    const hop = Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }),
      Animated.timing(value, { toValue: 0, duration: 340, easing: Easing.bounce, useNativeDriver: NATIVE }),
    ]);
    const animation = Animated.sequence([Animated.delay(300), Animated.loop(hop, { iterations: 3 })]);
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, value]);
  return <Animated.View style={{ transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  origin: { alignItems: 'center', height: 0, position: 'absolute', width: 0 },
});
