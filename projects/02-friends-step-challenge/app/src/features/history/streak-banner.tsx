import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette, spacing } from '@/design-system/tokens';
import type { StreakSummary } from '@/lib/streaks';
import { historyColors } from './history-tokens';

export function StreakEmblem({ large = false, compact = false }: { large?: boolean; compact?: boolean }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.emblem, large && styles.emblemLarge, compact && styles.emblemCompact]}>
    <View style={[styles.emblemInner, large && styles.emblemInnerLarge, compact && styles.emblemInnerCompact]}>
      <Ionicons name="trophy" size={large ? 62 : compact ? 30 : 42} color={palette.ink[950]} />
    </View>
    <View style={styles.sparkleOne}><Ionicons name="sparkles" color={palette.cream[50]} size={large ? 28 : compact ? 14 : 20} /></View>
    <View style={styles.sparkleTwo}><Ionicons name="sparkles" color={palette.cream[50]} size={large ? 22 : compact ? 12 : 16} /></View>
  </View>;
}

export function StreakBanner({ summary, onPress }: { summary: StreakSummary; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${summary.currentStreak} day walking streak. View your milestones`} onPress={onPress} style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
    <View style={styles.copy}><AppText variant="bodySmall" style={styles.copyStrong}>Look at you, showing up.</AppText></View>
    <View style={styles.streakDays}><Ionicons name="flame" size={28} color={historyColors.coral} /><AppText variant="numeric" style={styles.streakNumber}>{summary.currentStreak}</AppText><AppText variant="label" tone="secondary">day streak</AppText></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2, paddingHorizontal: 2, paddingBottom: 12 },
  copy: { flex: 1 }, copyStrong: { color: historyColors.ink, fontWeight: '800' },
  streakDays: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, streakNumber: { color: historyColors.ink, fontSize: 27, lineHeight: 30 },
  emblem: { width: 86, height: 94, justifyContent: 'center', alignItems: 'center' },
  emblemLarge: { width: 140, height: 144 },
  emblemCompact: { width: 66, height: 70 },
  emblemInner: { width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: palette.peach[100], backgroundColor: palette.peach[500], justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-8deg' }] },
  emblemInnerLarge: { width: 120, height: 120, borderRadius: 60, borderWidth: 7 },
  emblemInnerCompact: { width: 60, height: 60, borderRadius: 30, borderWidth: 4 },
  sparkleOne: { position: 'absolute', right: 0, top: 8 },
  sparkleTwo: { position: 'absolute', left: 0, bottom: 10 },
  pressed: { opacity: 0.85 },
});
