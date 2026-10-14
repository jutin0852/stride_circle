import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { spacing, touchTargets } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';

export function CircleActivityLink({ onPress }: { onPress: () => void }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Pressable accessibilityRole="link" accessibilityLabel="Activity" onPress={onPress} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
    <AppText tone="link" variant="label">Activity</AppText>
    <Ionicons color={colors.accentPressed} name="chevron-forward" size={15} />
  </Pressable>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    link: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, minHeight: touchTargets.minimum, paddingHorizontal: spacing.xs },
    pressed: { opacity: 0.72 },
  });
}
