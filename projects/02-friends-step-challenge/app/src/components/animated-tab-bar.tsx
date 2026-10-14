import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, I18nManager, Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { homeTheme } from '@/features/home/tokens';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Keep Expo Router's real tab bar, links, tab events, and accessibility intact. */
export function AnimatedTabBar(props: BottomTabBarProps) {
  const colors = homeTheme(useColorScheme() === 'dark');
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const previousGeometry = useRef('');
  const count = props.state.routes.length;
  const laneWidth = count ? Math.max(0, width - insets.left - insets.right) / count : 0;
  const index = I18nManager.isRTL ? count - 1 - props.state.index : props.state.index;
  const target = index * laneWidth;
  const geometry = `${width}:${count}:${insets.left}:${insets.right}`;

  useLayoutEffect(() => {
    if (!width) return;
    const resized = previousGeometry.current !== geometry;
    previousGeometry.current = geometry;
    if (reducedMotion || resized) {
      offset.stopAnimation(); offset.setValue(target); return;
    }
    const animation = Animated.spring(offset, {
      toValue: target, stiffness: 320, damping: 32, mass: 1,
      overshootClamping: true, isInteraction: false, useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [geometry, offset, reducedMotion, target, width]);

  return <View
    testID="app-bottom-navigation"
    onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ backgroundColor: Platform.OS === 'android' ? colors.panelEdge : colors.canvas }}
  >
    {width > 0 && count > 0 ? <Animated.View
      testID="bottom-tab-highlight"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.highlight, {
        backgroundColor: colors.ice,
        left: insets.left + 6,
        bottom: Math.max(insets.bottom, 8),
        width: Math.max(0, laneWidth - 12),
        transform: [{ translateX: offset }],
      }]}
    /> : null}
    <BottomTabBar {...props} />
  </View>;
}

const styles = StyleSheet.create({
  highlight: { position: 'absolute', borderRadius: 14, top: 8 + StyleSheet.hairlineWidth },
});
