import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { palette, radii, spacing } from '@/design-system/tokens';

type BrandLockupProps = {
  compact?: boolean;
};

export function BrandLockup({ compact = false }: BrandLockupProps) {
  return (
    <View accessibilityLabel="Stride Circle" accessible style={styles.row}>
      <View style={[styles.mark, compact && styles.markCompact]}>
        <View style={styles.leaf} />
        <View style={styles.fruit} />
        <View style={styles.stem} />
      </View>
      <AppText style={compact ? styles.compactName : styles.name} variant="titleSmall">STRIDE{compact ? ' ' : '\n'}CIRCLE</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  mark: { height: 34, position: 'relative', width: 32 },
  markCompact: { height: 28, width: 27 },
  leaf: { backgroundColor: palette.ink[700], borderRadius: 12, height: 17, left: 14, position: 'absolute', top: 1, transform: [{ rotate: '25deg' }], width: 10 },
  fruit: { backgroundColor: palette.coral[500], borderRadius: 13, bottom: 1, height: 21, left: 5, position: 'absolute', transform: [{ rotate: '-25deg' }], width: 20 },
  stem: { backgroundColor: palette.peach[300], borderRadius: radii.pill, height: 9, left: 1, position: 'absolute', top: 7, transform: [{ rotate: '35deg' }], width: 13 },
  name: { color: palette.ink[950], fontSize: 18, letterSpacing: -0.4, lineHeight: 18 },
  compactName: { color: palette.ink[950], fontSize: 15, letterSpacing: -0.3, lineHeight: 18 },
});
