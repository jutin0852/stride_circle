import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { WakaLogo } from '@/components/waka-logo';
import type { homeTheme } from './tokens';

type HomeTheme = ReturnType<typeof homeTheme>;

/**
 * The goal-reached moment on Home. The blue Waka badge sits in the hero once today's goal is met.
 * When it is reached while the app is open (`goalEvent` changes), the badge pops in, a small
 * sparkle burst plays, and the phone gives one success haptic. Reduce Motion keeps the haptic
 * and shows the badge without movement.
 */
export function GoalBadge({ colors, goalEvent, met, reduced, size }: { colors: HomeTheme; goalEvent: number; met: boolean; reduced: boolean; size: number }) {
  const [pop] = useState(() => new Animated.Value(met ? 1 : 0));
  const [burst] = useState(() => new Animated.Value(0));
  const played = useRef(goalEvent);

  useEffect(() => {
    if (!goalEvent || goalEvent === played.current) {
      if (met) pop.setValue(1);
      return;
    }
    played.current = goalEvent;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (reduced) { pop.setValue(1); return; }
    pop.setValue(0);
    burst.setValue(0);
    const animation = Animated.parallel([
      Animated.spring(pop, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(burst, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(burst, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => { animation.stop(); pop.setValue(1); burst.setValue(0); };
  }, [burst, goalEvent, met, pop, reduced]);

  if (!met) return null;
  return <View accessible={false} style={{ width: size, height: size }}>
    <Animated.View style={[styles.badge, {
      width: size, height: size, borderRadius: size / 2, backgroundColor: colors.blue, borderColor: '#FFFFFF', shadowColor: colors.edge,
      opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
      transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }, { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) }],
    }]}>
      <WakaLogo color="#FFFFFF" width={size * 0.62} />
    </Animated.View>
    {!reduced ? <Animated.View pointerEvents="none" style={[styles.sparkles, { opacity: burst, transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) }] }]}>
      {[colors.yellow, colors.coral, colors.blue].map((color, index) => <View key={color} style={{ position: 'absolute', backgroundColor: color, width: 7, height: 7, borderRadius: index === 1 ? 3.5 : 1, left: index * (size / 2) - 6, top: index === 1 ? -12 : size * 0.2, transform: [{ rotate: '30deg' }] }} />)}
    </Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', borderWidth: 3, elevation: 3, justifyContent: 'center', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  sparkles: { position: 'absolute', top: 0, left: 0, right: 0 },
});
