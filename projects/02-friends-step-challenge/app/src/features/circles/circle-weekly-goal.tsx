import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText, ProgressBar, Surface } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';

const MILESTONES = [25, 50, 75, 100] as const;

export function CircleWeeklyGoalCard({ circleId, goal, steps, canManage }: { circleId: string; goal: number | null; steps: number; canManage: boolean }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const percent = goal ? Math.min(100, Math.floor(steps / goal * 100)) : 0;

  return <Surface padding="lg" radius="lg" style={styles.card}>
    <View style={styles.heading}>
      <View style={styles.copy}><AppText variant="label">Shared weekly goal</AppText><AppText tone="secondary" variant="caption">Member steps synced this week</AppText></View>
      {canManage ? <Pressable accessibilityRole="button" accessibilityLabel={goal ? 'Edit shared weekly goal' : 'Set shared weekly goal'} onPress={() => router.push({ pathname: '/circle/[circleId]/weekly-goal', params: { circleId } })} hitSlop={8}><AppText variant="label" style={styles.action}>{goal ? 'Edit' : 'Set goal'}</AppText></Pressable> : null}
    </View>
    {goal ? <>
      <View style={styles.amount}><AppText variant="titleSmall">{formatSteps(steps)}</AppText><AppText tone="secondary" variant="bodySmall">of {formatSteps(goal)} steps · {percent}%</AppText></View>
      <ProgressBar accessibilityLabel="Circle weekly goal progress" value={steps} max={goal} fillColor={colors.accent} trackColor={colors.soft} />
      <View style={styles.milestones}>{MILESTONES.map((milestone) => <View key={milestone} accessibilityLabel={`${milestone}% circle goal milestone${percent >= milestone ? ', reached' : ', not yet reached'}`} style={[styles.milestone, percent >= milestone && styles.milestoneReached]}><AppText variant="caption" style={[styles.milestoneText, percent >= milestone && styles.milestoneTextReached]}>{milestone}%</AppText></View>)}</View>
    </> : <AppText tone="secondary" variant="bodySmall">{canManage ? 'Set a shared target and see your circle move toward it together.' : 'The circle owner can set a shared target for the week.'}</AppText>}
  </Surface>;
}

function formatSteps(value: number) { return Math.max(0, Math.floor(value)).toLocaleString(); }

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    card: { gap: 12 },
    heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    copy: { flex: 1, gap: 3 },
    action: { color: colors.accentPressed },
    amount: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    milestones: { flexDirection: 'row', gap: 7, justifyContent: 'space-between' },
    milestone: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, paddingVertical: 7 },
    milestoneReached: { backgroundColor: colors.soft, borderColor: colors.accent },
    milestoneText: { color: colors.muted, fontWeight: '700' },
    milestoneTextReached: { color: colors.accentPressed },
  });
}
