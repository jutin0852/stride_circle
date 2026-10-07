import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { radii, spacing, touchTargets } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type SegmentItem<T extends string> = { label: string; value: T };

type SegmentedControlProps<T extends string> = {
  accessibilityLabel: string;
  items: readonly SegmentItem<T>[];
  onChange: (value: T) => void;
  value: T;
};

export function SegmentedControl<T extends string>({ accessibilityLabel, items, onChange, value }: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.container, { backgroundColor: colors.soft }]}>
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={item.value}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [styles.segment, selected && { backgroundColor: colors.brandDark }, pressed && styles.pressed]}
          >
            <AppText tone={selected ? 'inverse' : 'secondary'} variant="label">{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radii.pill, flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  segment: { alignItems: 'center', borderRadius: radii.pill, flex: 1, justifyContent: 'center', minHeight: touchTargets.minimum, paddingHorizontal: spacing.md },
  pressed: { opacity: 0.78 },
});
