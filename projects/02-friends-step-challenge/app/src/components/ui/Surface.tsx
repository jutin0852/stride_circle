import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { elevation, radii, semanticColors, spacing } from '@/design-system/tokens';

export type SurfaceVariant = 'card' | 'raised' | 'soft' | 'brand' | 'outline';

type SurfaceProps = ViewProps & {
  padding?: keyof typeof spacing;
  radius?: keyof typeof radii;
  variant?: SurfaceVariant;
};

const variantStyles: Record<SurfaceVariant, ViewStyle> = {
  card: { backgroundColor: semanticColors.card, borderColor: semanticColors.border, borderWidth: 1 },
  raised: { backgroundColor: semanticColors.raised, ...elevation.card },
  soft: { backgroundColor: semanticColors.soft },
  brand: { backgroundColor: semanticColors.brandAction },
  outline: { backgroundColor: 'transparent', borderColor: semanticColors.border, borderWidth: 1 },
};

export function Surface({ children, padding = 'xl', radius = 'lg', style, variant = 'card', ...props }: SurfaceProps) {
  return <View {...props} style={[styles.base, variantStyles[variant], { borderRadius: radii[radius], padding: spacing[padding] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
