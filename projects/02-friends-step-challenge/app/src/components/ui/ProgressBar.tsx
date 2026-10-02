import { StyleSheet, View } from 'react-native';

import { radii, semanticColors, spacing } from '@/design-system/tokens';

type ProgressBarProps = {
  accessibilityLabel?: string;
  max?: number;
  tone?: 'brand' | 'success' | 'coral';
  value: number;
};

const fillColors = {
  brand: semanticColors.brandAction,
  success: semanticColors.successContent,
  coral: semanticColors.celebrationSurface,
} as const;

export function ProgressBar({ accessibilityLabel = 'Progress', max = 1, tone = 'brand', value }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="progressbar" accessibilityValue={{ max, min: 0, now: Math.min(Math.max(value, 0), max) }} style={styles.track}>
      <View style={[styles.fill, { backgroundColor: fillColors[tone], width: `${percentage * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: semanticColors.soft, borderRadius: radii.pill, height: spacing.sm, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: radii.pill, height: '100%', minWidth: 4 },
});
