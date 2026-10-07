import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = {
  children: string;
  tone?: BadgeTone;
};

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const { colors } = useAppTheme();
  const toneStyles: Record<BadgeTone, { backgroundColor: string; textTone: 'primary' | 'success' | 'warning' | 'danger' | 'link' }> = {
    neutral: { backgroundColor: colors.soft, textTone: 'primary' },
    brand: { backgroundColor: colors.brandActionSoft, textTone: 'primary' },
    success: { backgroundColor: colors.successSurface, textTone: 'success' },
    warning: { backgroundColor: colors.warningSurface, textTone: 'warning' },
    danger: { backgroundColor: colors.dangerSurface, textTone: 'danger' },
    info: { backgroundColor: colors.infoSurface, textTone: 'link' },
  };
  const appearance = toneStyles[tone];

  return <View style={[styles.base, { backgroundColor: appearance.backgroundColor }]}><AppText tone={appearance.textTone} variant="label">{children}</AppText></View>;
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
});
