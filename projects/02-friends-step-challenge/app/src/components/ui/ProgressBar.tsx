import { StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

type ProgressBarProps = {
  accessibilityLabel?: string;
  max?: number;
  fillColor?: string;
  trackColor?: string;
  tone?: 'brand' | 'success' | 'coral';
  value: number;
};

export function ProgressBar({ accessibilityLabel = 'Progress', fillColor, max = 1, tone = 'brand', trackColor, value }: ProgressBarProps) {
  const { colors } = useAppTheme();
  const fillColors = {
    brand: colors.brandAction,
    success: colors.successContent,
    coral: colors.celebrationSurface,
  };
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="progressbar" accessibilityValue={{ max, min: 0, now: Math.min(Math.max(value, 0), max) }} style={[styles.track, { backgroundColor: trackColor ?? colors.soft }]}>
      <View style={[styles.fill, { backgroundColor: fillColor ?? fillColors[tone], width: `${percentage * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radii.pill, height: spacing.sm, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: radii.pill, height: '100%', minWidth: 4 },
});
