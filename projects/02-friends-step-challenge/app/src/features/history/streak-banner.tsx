import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { spacing } from '@/design-system/tokens';
import type { StreakSummary } from '@/lib/streaks';
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

export function StreakBanner({ summary, onPress }: { summary: StreakSummary; onPress: () => void }) {
  const { colors: historyColors } = useHistoryTheme();
  const styles = useMemo(() => createStyles(historyColors), [historyColors]);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${summary.currentStreak} day walking streak. View your milestones`} onPress={onPress} style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
    <View style={styles.copy}><AppText variant="bodySmall" style={styles.copyStrong}>Look at you, showing up.</AppText></View>
    <View style={styles.streakDays}><Svg width={24} height={28} viewBox="0 0 24 24" accessible={false}><Path d="M13 2c2 6-4 7-2 11 2-1 3-3 3-5 5 4 7 7 5 11-3 5-11 4-14 0C1 13 7 9 7 6c1 3 2 3 3 4 3-3 1-5 3-8Z" fill="none" stroke={historyColors.streak === '#F2A15F' ? historyColors.streak : '#BD5415'} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg><AppText variant="numeric" style={styles.streakNumber}>{summary.currentStreak}</AppText><AppText variant="label" tone="secondary" style={styles.streakLabel}>day streak</AppText></View>
  </Pressable>;
}

function createStyles(historyColors: HistoryColorSet) { return StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: 2 },
  copy: { flex: 1 }, copyStrong: { color: historyColors.ink, fontWeight: '800', fontSize: 15, lineHeight: 19 },
  streakDays: { flexDirection: 'row', alignItems: 'center', gap: 5 }, streakNumber: { color: historyColors.ink, fontSize: 27, lineHeight: 28 }, streakLabel: { fontSize: 12, lineHeight: 15 },
  emblem: { width: 86, height: 94, justifyContent: 'center', alignItems: 'center' },
  emblemLarge: { width: 140, height: 144 },
  emblemCompact: { width: 66, height: 70 },
  emblemInner: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: historyColors.streakSurface, backgroundColor: historyColors.streak, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-8deg' }] },
  emblemInnerLarge: { width: 120, height: 120, borderRadius: 60, borderWidth: 7 },
  emblemInnerCompact: { width: 60, height: 60, borderRadius: 30, borderWidth: 4 },
  sparkleOne: { position: 'absolute', right: 0, top: 8 },
  sparkleTwo: { position: 'absolute', left: 0, bottom: 10 },
  pressed: { opacity: 0.85 },
}); }
