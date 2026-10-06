import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { radii, semanticColors, spacing } from '@/design-system/tokens';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = {
  children: string;
  tone?: BadgeTone;
};

const toneStyles: Record<BadgeTone, { backgroundColor: string; textTone: 'primary' | 'success' | 'warning' | 'danger' | 'link' }> = {
  neutral: { backgroundColor: semanticColors.soft, textTone: 'primary' },
  brand: { backgroundColor: semanticColors.brandActionSoft, textTone: 'primary' },
  success: { backgroundColor: semanticColors.successSurface, textTone: 'success' },
  warning: { backgroundColor: semanticColors.warningSurface, textTone: 'warning' },
  danger: { backgroundColor: semanticColors.dangerSurface, textTone: 'danger' },
  info: { backgroundColor: semanticColors.infoSurface, textTone: 'link' },
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const appearance = toneStyles[tone];

  return <View style={[styles.base, { backgroundColor: appearance.backgroundColor }]}><AppText tone={appearance.textTone} variant="label">{children}</AppText></View>;
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
