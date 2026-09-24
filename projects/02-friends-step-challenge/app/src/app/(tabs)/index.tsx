import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/auth/auth-provider';
import { formatSteps } from '@/data/circle';
import { useCurrentCircle } from '@/hooks/use-current-circle';
import { useDailyStepRecord } from '@/hooks/use-daily-step-record';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useDailyStepGoal } from '@/hooks/use-daily-step-goal';
import { useDailyGoalCelebration } from '@/hooks/use-daily-goal-celebration';
import { usePersonalStreak } from '@/hooks/use-personal-streak';
import { useStepTracking, type StepTrackingStatus } from '@/hooks/use-step-tracking';
import { getLocalDateKey } from '@/lib/daily-steps';
import { colors } from '@/theme';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { CelebrationSheet } from '@/components/celebration-sheet';

export default function TodayRoute() {
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const { details: circleDetails } = useCurrentCircle(user?.uid);
  const walkingCircle = circleDetails?.circle.activityType === 'walk' ? circleDetails : null;
  const { requestStepAccess, status, todaySteps } = useStepTracking();
  const tracking = status === 'tracking';
  const { savedSteps, syncStatus } = useDailyStepRecord({
    circleId: walkingCircle?.circle.id,
    shouldSave: tracking,
    steps: todaySteps,
    userId: user?.uid,
  });
  const yourSteps = tracking ? todaySteps : savedSteps ?? 0;
  const { goal, status: goalStatus } = useDailyStepGoal(user?.uid);
  const streak = usePersonalStreak({ goal, todaySteps: yourSteps, userId: user?.uid });
  const dailyGoalCelebration = useDailyGoalCelebration({
    dateKey: getLocalDateKey(),
    goalMet: goalStatus === 'ready' && yourSteps >= goal,
    userId: user?.uid,
  });
  const progress = Math.min(yourSteps / goal, 1);
  const remainingSteps = Math.max(goal - yourSteps, 0);
  const buttonDisabled = ['checking', 'requesting', 'tracking', 'unavailable'].includes(status);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());
  const greeting = profile.displayName.split(' ')[0] || 'there';
  const greetingInfo = getGreetingInfo(new Date());
  const showStepAction = !tracking && status !== 'checking' && status !== 'unavailable';

  return <>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.header}>
        <View>
          <View style={styles.greetingRow}><Ionicons color={greetingInfo.color} name={greetingInfo.icon} size={20} /><Text style={styles.greeting}>{greetingInfo.label}, {greeting}</Text></View>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <DicebearAvatar choice={profile.avatar} fallback={greeting[0]?.toUpperCase() ?? 'S'} size={42} />
      </View>

      <View style={styles.stepsPanel}>
        <Text style={styles.eyebrow}>TODAY&apos;S STEPS</Text>
        <Text selectable style={styles.steps}>
          {tracking || savedSteps !== null ? formatSteps(yourSteps) : '—'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/daily-goal')} style={({ pressed }) => [styles.goalProgress, pressed && styles.pressed]}>
          <View style={styles.goalProgressHeader}><View><Text style={styles.goalLabel}>DAILY GOAL</Text><Text style={styles.goalCaption}>{goalStatus === 'loading' ? 'Loading your goal…' : yourSteps >= goal ? 'Goal reached — great work.' : `${formatSteps(remainingSteps)} steps to go`}</Text></View><Text selectable style={styles.goalValue}>{formatSteps(goal)}</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
        </Pressable>
        <View style={styles.divider} />
        <View style={styles.metrics}>
          <Metric icon="bullseye-outline" label="GOAL" value={`${Math.round(progress * 100)}%`} />
          <Metric blueFlame={streak.summary.protectedDateKey !== null} icon="flame" label={streak.summary.protectedDateKey ? 'PROTECTED' : 'STREAK'} value={streak.status === 'loading' ? '—' : `${streak.summary.currentStreak} days`} />
        </View>
      </View>

      {showStepAction ? <Pressable
        accessibilityRole="button"
        disabled={buttonDisabled}
        onPress={() => void requestStepAccess()}
        style={({ pressed }) => [styles.primaryAction, buttonDisabled && styles.actionDisabled, pressed && !buttonDisabled && styles.pressed]}>
        <Text style={[styles.primaryActionText, buttonDisabled && styles.disabledActionText]}>{getTrackingButtonText(status)}</Text>
        <Ionicons color={buttonDisabled ? colors.muted : '#FFFFFF'} name="chevron-forward" size={20} />
      </Pressable> : null}
      {syncStatus === 'error' ? <Text style={styles.syncState}>Your latest step total could not be saved yet.</Text> : null}
    </ScrollView>
    <CelebrationSheet
      body={`You reached ${formatSteps(goal)} steps today. ${streak.summary.currentStreak > 1 ? `Your ${streak.summary.currentStreak}-day streak is still going.` : 'That is one strong day of movement.'}`}
      onDismiss={dailyGoalCelebration.dismiss}
      primaryLabel="Keep moving"
      title="Daily goal reached"
      visible={dailyGoalCelebration.isVisible}
    />
  </>;
}

function Metric({ blueFlame = false, icon, label, value }: { blueFlame?: boolean; icon: 'bullseye-outline' | 'flame'; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      {icon === 'flame' ? <Ionicons color={blueFlame ? '#2563EB' : '#F97316'} name="flame" size={16} /> : <MaterialCommunityIcons color={colors.accent} name="target" size={18} />}
      <Text selectable style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getGreetingInfo(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return { color: '#F59E0B', icon: 'sunny-outline' as const, label: 'Good morning' };
  if (hour < 18) return { color: '#F97316', icon: 'partly-sunny-outline' as const, label: 'Good afternoon' };
  return { color: '#6366F1', icon: 'moon-outline' as const, label: 'Good evening' };
}

function getTrackingButtonText(status: StepTrackingStatus) {
  if (status === 'checking') return 'Checking your step sensor';
  if (status === 'requesting') return 'Requesting step access';
  if (status === 'unavailable') return 'Step tracking unavailable';
  return status === 'denied' || status === 'error' ? 'Try step tracking again' : 'Enable step tracking';
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { gap: 18, padding: 22, paddingBottom: 36 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, greetingRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  greeting: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  date: { color: colors.muted, fontSize: 14, marginTop: 3 },
  stepsPanel: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, padding: 22 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  steps: { color: colors.ink, fontSize: 60, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -3, marginTop: 6 },
  goalProgress: { backgroundColor: colors.soft, borderRadius: 16, gap: 10, marginTop: 18, padding: 14 }, goalProgressHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, goalLabel: { color: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, goalCaption: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 3 }, goalValue: { color: colors.ink, fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '800' }, progressTrack: { backgroundColor: '#D7E2FA', borderRadius: 4, height: 8, overflow: 'hidden' }, progressFill: { backgroundColor: colors.accent, borderRadius: 4, height: 8, minWidth: 4 },
  divider: { backgroundColor: colors.border, height: 1, marginVertical: 20 },
  metrics: { flexDirection: 'row', gap: 36 },
  metric: { alignItems: 'flex-start', gap: 4 },
  metricValue: { color: colors.ink, fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  primaryAction: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', minHeight: 56, paddingHorizontal: 19 },
  actionDisabled: { backgroundColor: colors.soft },
  primaryActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledActionText: { color: colors.muted },
  syncState: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});