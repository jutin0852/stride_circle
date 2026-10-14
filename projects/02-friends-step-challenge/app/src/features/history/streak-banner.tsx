import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useHistoryTheme } from './history-tokens';
import type { HistoryColorSet } from './history-tokens';

export function StreakEmblem({ large = false, compact = false }: { large?: boolean; compact?: boolean }) {
  const { colors: historyColors } = useHistoryTheme();
  const styles = useMemo(() => createStyles(historyColors), [historyColors]);
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.emblem, large && styles.emblemLarge, compact && styles.emblemCompact]}>
    <View style={[styles.emblemInner, large && styles.emblemInnerLarge, compact && styles.emblemInnerCompact]}>
      <Ionicons name="trophy" size={large ? 62 : compact ? 30 : 42} color={historyColors.yellowDeep} />
    </View>
    <View style={styles.sparkleOne}><Ionicons name="sparkles" color={historyColors.paper} size={large ? 28 : compact ? 14 : 20} /></View>
    <View style={styles.sparkleTwo}><Ionicons name="sparkles" color={historyColors.paper} size={large ? 22 : compact ? 12 : 16} /></View>
  </View>;
}

function createStyles(historyColors: HistoryColorSet) { return StyleSheet.create({
  emblem: { width: 86, height: 94, justifyContent: 'center', alignItems: 'center' },
  emblemLarge: { width: 140, height: 144 },
  emblemCompact: { width: 66, height: 70 },
  emblemInner: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: historyColors.streakSurface, backgroundColor: historyColors.streak, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-8deg' }] },
  emblemInnerLarge: { width: 120, height: 120, borderRadius: 60, borderWidth: 7 },
  emblemInnerCompact: { width: 60, height: 60, borderRadius: 30, borderWidth: 4 },
  sparkleOne: { position: 'absolute', right: 0, top: 8 },
  sparkleTwo: { position: 'absolute', left: 0, bottom: 10 },
}); }
