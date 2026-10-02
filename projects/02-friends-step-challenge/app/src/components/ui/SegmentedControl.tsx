import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { radii, semanticColors, spacing, touchTargets } from '@/design-system/tokens';

export type SegmentItem<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  accessibilityLabel: string;
  items: readonly SegmentItem<T>[];
  onChange: (value: T) => void;
  value: T;
};

export function SegmentedControl<T extends string>({ accessibilityLabel, items, onChange, value }: SegmentedControlProps<T>) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [styles.segment, selected && styles.selected, pressed && styles.pressed]}
          >
            <AppText tone={selected ? 'inverse' : 'secondary'} variant="label">{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: semanticColors.soft, borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  segment: { alignItems: 'center', borderRadius: radii.pill, flex: 1, justifyContent: 'center', minHeight: touchTargets.minimum, paddingHorizontal: spacing.md },
  selected: { backgroundColor: semanticColors.brandDark },
  pressed: { opacity: 0.78 },
});
