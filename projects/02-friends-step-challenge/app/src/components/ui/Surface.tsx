import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { elevation, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type SurfaceVariant = 'card' | 'raised' | 'soft' | 'brand' | 'outline';

type SurfaceProps = ViewProps & {
  padding?: keyof typeof spacing;
  radius?: keyof typeof radii;
  variant?: SurfaceVariant;
};

export function Surface({ children, padding = 'xl', radius = 'lg', style, variant = 'card', ...props }: SurfaceProps) {
  const { colors, isDark } = useAppTheme();
  const variantStyles: Record<SurfaceVariant, ViewStyle> = {
    card: {
      backgroundColor: colors.card,
      borderBottomWidth: isDark ? 0 : 4,
      borderColor: isDark ? colors.border : colors.borderStrong,
      borderWidth: isDark ? 1 : 2,
    },
    raised: { backgroundColor: colors.raised, ...(isDark ? { borderColor: colors.borderSubtle, borderWidth: 1 } : elevation.card) },
    soft: { backgroundColor: colors.soft },
    brand: { backgroundColor: colors.brandAction },
    outline: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
  };
  return <View {...props} style={[styles.base, variantStyles[variant], { borderRadius: radii[radius], padding: spacing[padding] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
