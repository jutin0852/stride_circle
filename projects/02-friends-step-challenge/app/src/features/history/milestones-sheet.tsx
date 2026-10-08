import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useMemo, useRef } from 'react';

import { AppSheet, AppText, Button, IconButton, ProgressBar, type AppSheetFocusRef } from '@/components/ui';
import { radii, spacing } from '@/design-system/tokens';
import { nextWalkingMilestone, WALKING_MILESTONES } from '@/domain/walking-history';
import type { StreakSummary } from '@/lib/streaks';
import { StreakEmblem } from './streak-banner';
import { useHistoryTheme } from './history-tokens';
import type { HistoryColorSet } from './history-tokens';

export function MilestonesSheet({ visible, onClose, returnFocusRef, summary }: { visible: boolean; onClose: () => void; returnFocusRef?: AppSheetFocusRef; summary: StreakSummary }) {
  const { colors: historyColors } = useHistoryTheme();
  const styles = useMemo(() => createStyles(historyColors), [historyColors]);
  const next = nextWalkingMilestone(summary.currentStreak);
  const closeButtonRef = useRef<View>(null);
  return <AppSheet
    accessibilityLabel="Walking milestones"
    initialFocusRef={closeButtonRef}
    keyboardAware
    onClose={onClose}
    returnFocusRef={returnFocusRef}
    sheetStyle={styles.sheet}
    visible={visible}
  >
        <View style={styles.toolbar}><AppText variant="titleSmall">Walking milestones</AppText><IconButton accessibilityLabel="Close milestones" onPress={onClose} ref={closeButtonRef}><Ionicons name="close" size={22} color={historyColors.ink} /></IconButton></View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <StreakEmblem large />
            <AppText accessibilityRole="header" variant="headline" style={styles.center}>Small steps.{ '\n' }Big milestones.</AppText>
            <AppText variant="bodySmall" style={styles.center}>Every day you show up is worth celebrating.</AppText>
            <View style={styles.stats}><Stat value={summary.currentStreak} label="CURRENT STREAK" /><View style={styles.separator} /><Stat value={summary.bestStreak} label="BEST IN SAVED HISTORY" /></View>
          </View>
          <View style={styles.intro}><AppText variant="titleSmall">Your next little victory</AppText><AppText variant="bodySmall" tone="secondary">{next ? `${Math.max(0, next.days - summary.currentStreak)} more streak days to ${next.title.toLowerCase()}.` : 'You’ve reached every milestone. Keep walking your way.'}</AppText><ProgressBar value={summary.currentStreak} max={next?.days ?? 365} tone="coral" trackColor={historyColors.panelEdge} accessibilityLabel="Next walking milestone" /></View>
          {WALKING_MILESTONES.map((milestone) => {
            const earned = summary.bestStreak >= milestone.days;
            return <View key={milestone.days} style={[styles.reward, earned && styles.rewardEarned]}>
              <View style={[styles.icon, earned && styles.iconEarned]}><Ionicons name={earned ? milestone.icon : 'lock-closed-outline'} size={28} color={earned ? historyColors.ink : historyColors.muted} /></View>
              <View style={styles.rewardCopy}><AppText variant="eyebrow" tone={earned ? 'success' : 'secondary'}>{milestone.days} DAY STREAK</AppText><AppText variant="titleSmall">{milestone.title}</AppText><AppText variant="bodySmall" tone="secondary">{milestone.description}</AppText><View style={styles.status}><Ionicons name={earned ? 'checkmark-circle' : 'lock-closed'} size={14} color={earned ? historyColors.green : historyColors.muted} /><AppText variant="label" tone={earned ? 'success' : 'secondary'}>{earned ? 'Reached in saved history' : 'Still ahead of you'}</AppText></View></View>
            </View>;
          })}
          <View style={styles.explanation}><Ionicons name="shield-checkmark-outline" size={23} color={historyColors.blueDeep} /><View style={styles.rewardCopy}><AppText variant="label">Room for a rest day</AppText><AppText variant="bodySmall" tone="secondary">Seven goal-reaching days earn one automatic streak protection. The next missed completed day uses it. Today never breaks your streak before midnight.</AppText></View></View>
          <AppText variant="bodySmall" tone="secondary">Based on up to 400 saved days and your current daily goal. Changing your goal can change these milestones. These are personal celebrations, not prizes or circle scores.</AppText>
          <Button onPress={onClose} variant="secondary">Keep stepping</Button>
        </ScrollView>
  </AppSheet>;
}

function Stat({ value, label }: { value: number; label: string }) {
  const { colors: historyColors } = useHistoryTheme();
  const styles = useMemo(() => createStyles(historyColors), [historyColors]);
  return <View style={styles.stat}><AppText variant="numeric">{value}</AppText><AppText variant="eyebrow" style={styles.center}>{label}</AppText></View>;
}

function createStyles(historyColors: HistoryColorSet) { return StyleSheet.create({
  sheet: { width: '100%', maxWidth: 560, maxHeight: '91%', paddingHorizontal: 0, paddingTop: 0 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl },
  hero: { alignItems: 'center', backgroundColor: historyColors.streakSurface, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md }, center: { textAlign: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: spacing.sm }, stat: { flex: 1, alignItems: 'center', gap: spacing.sm }, separator: { width: 1, height: 48, backgroundColor: historyColors.streak, marginHorizontal: spacing.md },
  intro: { gap: spacing.sm, paddingVertical: spacing.sm },
  reward: { borderWidth: 1, borderColor: historyColors.line, borderRadius: radii.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }, rewardEarned: { backgroundColor: historyColors.yellowPale, borderColor: historyColors.yellow },
  icon: { width: 52, height: 56, backgroundColor: historyColors.ice, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' }, iconEarned: { backgroundColor: historyColors.yellowPale },
  rewardCopy: { flex: 1, gap: spacing.xs }, status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  explanation: { flexDirection: 'row', gap: spacing.md, backgroundColor: historyColors.ice, padding: spacing.lg, borderRadius: radii.lg },
}); }
