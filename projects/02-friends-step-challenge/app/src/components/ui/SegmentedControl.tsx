import { useEffect, useRef, useState } from 'react';
import { Animated, I18nManager, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { radii, spacing, touchTargets, opacity } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';


export type SegmentItem<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  accessibilityLabel: string;
  items: readonly SegmentItem<T>[];
  onChange: (value: T) => void;
  variant?: 'brand' | 'surface';
  value: T;
};

export function SegmentedControl<T extends string>({ accessibilityLabel, items, onChange, value, variant = 'brand' }: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const reducedMotion = useReducedMotion();
  const [offset] = useState(() => new Animated.Value(0));
  const previousGeometry = useRef({ width: 0, count: 0 });
  const selectedIndex = items.findIndex(item => item.value === value);
  const segmentWidth = items.length ? Math.max(0, (width - spacing.xs * (items.length + 1)) / items.length) : 0;
  const physicalIndex = I18nManager.isRTL ? items.length - 1 - selectedIndex : selectedIndex;
  const target = selectedIndex < 0 ? 0 : physicalIndex * (segmentWidth + spacing.xs);
  const selectedColor = variant === 'surface' ? colors.card : colors.brandDark;

  useEffect(() => {
    if (!width) return;
    const resized = previousGeometry.current.width !== width || previousGeometry.current.count !== items.length;
    previousGeometry.current = { width, count: items.length };
    // Align first layout/resizes immediately; only selection changes should slide.
    if (reducedMotion || resized || selectedIndex < 0) {
      offset.stopAnimation();
      offset.setValue(target);
      return;
    }
    const animation = Animated.spring(offset, {
      toValue: target,
      stiffness: 320,
      damping: 32,
      mass: 1,
      overshootClamping: true,
      isInteraction: false,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [items.length, offset, reducedMotion, selectedIndex, target, width]);

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="tablist" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.container, { backgroundColor: colors.soft }]}>
      {width > 0 && selectedIndex >= 0 ? <Animated.View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        testID="segmented-control-highlight"
        style={[styles.highlight, { backgroundColor: selectedColor, width: segmentWidth, transform: [{ translateX: offset }] }]}
      /> : null}
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && width === 0 && { backgroundColor: selectedColor },
              pressed && styles.pressed,
            ]}
          >
            <AppText tone={selected ? (variant === 'brand' ? 'inverse' : 'primary') : 'secondary'} variant="label">{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  highlight: { borderRadius: radii.pill, bottom: spacing.xs, left: spacing.xs, position: 'absolute', top: spacing.xs },
  segment: { alignItems: 'center', borderRadius: radii.pill, flex: 1, justifyContent: 'center', minHeight: touchTargets.minimum, paddingHorizontal: spacing.md },
  pressed: { opacity: opacity.pressed },
});
