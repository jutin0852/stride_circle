import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import {
  AppText,
  Badge,
  BrandLockup,
  Button,
  Divider,
  IconButton,
  ProgressBar,
  SectionHeader,
  StateCard,
  Surface,
} from '@/components/ui';
import { CelebrationSheet } from '@/components/celebration-sheet';
import { formatSteps } from '@/data/circle';
import { useCircleDailySteps } from '@/hooks/use-circle-daily-steps';
import { useCurrentCircle } from '@/hooks/use-current-circle';
import { useDailyGoalCelebration } from '@/hooks/use-daily-goal-celebration';
import { useDailyStepGoal } from '@/hooks/use-daily-step-goal';
import { useDailyStepRecord } from '@/hooks/use-daily-step-record';
import { usePersonalStreak } from '@/hooks/use-personal-streak';
import { useStepTracking, type StepTrackingStatus } from '@/hooks/use-step-tracking';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getLocalDateKey } from '@/lib/daily-steps';
import type { CircleMember } from '@/lib/circles';
import { iconSizes, layout, palette, radii, semanticColors, spacing } from '@/design-system/tokens';
import { DicebearAvatar } from '@/components/dicebear-avatar';

export default function TodayRoute() {
  const { user } = useAuth();
  const profile = useUserProfile(user);
  const { details: circleDetails } = useCurrentCircle(user?.uid);
  const walkingCircle = circleDetails?.circle.activityType === 'walk' ? circleDetails : null;
  const { openHealthSettings, requestStepAccess, source, status, todaySteps } = useStepTracking();
  const { savedSteps, syncStatus } = useDailyStepRecord({
    circleId: walkingCircle?.circle.id,
    shouldSave: status === 'tracking',
    source,
    steps: todaySteps,
    userId: user?.uid,
  });
  const yourSteps = status === 'tracking' ? todaySteps : savedSteps ?? 0;
  const { goal, status: goalStatus } = useDailyStepGoal(user?.uid);
  const streak = usePersonalStreak({ goal, todaySteps: yourSteps, userId: user?.uid });
  const dailyGoalCelebration = useDailyGoalCelebration({
    dateKey: getLocalDateKey(),
    goalMet: goalStatus === 'ready' && yourSteps >= goal,
    userId: user?.uid,
  });
  const { steps: circleSteps, status: circleStepsStatus } = useCircleDailySteps(
    walkingCircle?.circle.id,
    undefined,
    walkingCircle?.circle.competitionTimeZone,
  );
  const circleRanking = useMemo(
    () => (circleDetails?.members ?? [])
      .map((member) => ({ member, steps: circleSteps[member.userId] ?? 0 }))
      .sort((first, second) => second.steps - first.steps),
    [circleDetails?.members, circleSteps],
  );
  const yourRank = circleRanking.findIndex((entry) => entry.member.userId === user?.uid) + 1;
  const progress = goal > 0 ? Math.min(yourSteps / goal, 1) : 0;
  const remainingSteps = Math.max(goal - yourSteps, 0);
  const greetingInfo = getGreetingInfo(new Date());
  const greeting = profile.displayName.split(' ')[0] || 'there';
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
  }).format(new Date());
  const isScoreReady = circleStepsStatus === 'ready' && circleSteps[user?.uid ?? ''] !== undefined;
  const showStepAction = status === 'checking' || status === 'ready' || status === 'requesting';
  const syncIcon = syncStatus === 'error' ? 'alert-circle-outline' : status === 'tracking' || savedSteps !== null ? 'checkmark-circle-outline' : 'time-outline';
  const syncColor = syncStatus === 'error' ? semanticColors.dangerContent : status === 'tracking' || savedSteps !== null ? semanticColors.successContent : semanticColors.contentTertiary;

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
        <View style={styles.topBar}>
          <BrandLockup compact />
          <View style={styles.topBarActions}>
            <IconButton accessibilityLabel="Notifications not available yet" disabled filled>
              <Ionicons color={semanticColors.contentSecondary} name="notifications-outline" size={iconSizes.md} />
            </IconButton>
            <Pressable accessibilityLabel="Open your profile" accessibilityRole="button" onPress={() => router.push('/profile')}>
              <DicebearAvatar choice={profile.avatar} fallback={greeting[0]?.toUpperCase() ?? 'S'} size={44} />
            </Pressable>
          </View>
        </View>

        <View style={styles.intro}>
          <View style={styles.greetingRow}>
            <Ionicons color={greetingInfo.color} name={greetingInfo.icon} size={iconSizes.sm} />
            <AppText tone="secondary" variant="bodySmall">{greetingInfo.label}, {greeting}</AppText>
          </View>
          <AppText variant="headline">Today</AppText>
          <AppText tone="secondary" variant="bodySmall">{dateLabel}</AppText>
        </View>

        <Surface padding="none" radius="xl" style={styles.heroCard} variant="card">
          <StepIllustration />
          <View style={styles.heroCopy}>
            <AppText tone="secondary" variant="eyebrow">YOUR WALKING SCORE</AppText>
            <View style={styles.stepNumberRow}>
              <AppText selectable style={styles.stepNumber} variant="display">{status === 'tracking' || savedSteps !== null ? formatSteps(yourSteps) : '—'}</AppText>
              <AppText tone="secondary" style={styles.stepUnit} variant="bodySmall">steps</AppText>
            </View>
            <Pressable accessibilityHint="Opens daily goal settings" accessibilityRole="button" onPress={() => router.push('/daily-goal')} style={({ pressed }) => [styles.goalPanel, pressed && styles.pressed]}>
              <View style={styles.goalPanelHeader}>
                <View style={styles.goalCopy}>
                  <AppText tone="secondary" variant="eyebrow">DAILY GOAL</AppText>
                  <AppText tone={yourSteps >= goal ? 'success' : 'secondary'} variant="bodySmall">
                    {goalStatus === 'loading' ? 'Loading your goal…' : yourSteps >= goal ? 'Goal reached — great work.' : `${formatSteps(remainingSteps)} steps to go`}
                  </AppText>
                </View>
                <AppText selectable variant="label">{formatSteps(goal)}</AppText>
              </View>
              <ProgressBar accessibilityLabel="Daily goal progress" max={goal} tone={yourSteps >= goal ? 'success' : 'brand'} value={yourSteps} />
            </Pressable>
          </View>
          <Divider />
          <View style={styles.statGrid}>
            <Stat icon="goal" label="GOAL" value={`${Math.round(progress * 100)}%`} />
            <Stat icon="streak" label={streak.summary.protectedDateKey ? 'PROTECTED' : 'STREAK'} value={streak.status === 'loading' ? '—' : `${streak.summary.currentStreak} days`} />
          </View>
        </Surface>

        <View style={styles.syncRow}>
          <Ionicons color={syncColor} name={syncIcon} size={iconSizes.sm} />
          <AppText tone={syncStatus === 'error' ? 'danger' : 'secondary'} variant="bodySmall">
            {getSyncStatusLabel({ savedSteps, source, status, syncStatus })}
          </AppText>
        </View>

        {status === 'denied' ? <StateCard
          actionLabel="Open health settings"
          description="Stride Circle needs step access to keep your score and circle standings up to date."
          icon={<Ionicons color={semanticColors.warningContent} name="lock-open-outline" size={iconSizes.md} />}
          onAction={() => void openHealthSettings()}
          title="Step access is turned off"
          tone="warning"
        /> : null}
        {status === 'unavailable' ? <StateCard
          description="This device cannot provide a reliable daily step total yet. Try again on a supported iPhone or Android build."
          icon={<Ionicons color={semanticColors.infoContent} name="phone-portrait-outline" size={iconSizes.md} />}
          title="Step tracking is unavailable"
          tone="info"
        /> : null}
        {status === 'error' ? <StateCard
          actionLabel="Try again"
          description="We could not read your health data. Check your permissions and try syncing again."
          icon={<Ionicons color={semanticColors.dangerContent} name="refresh-outline" size={iconSizes.md} />}
          onAction={() => void requestStepAccess()}
          title="We could not sync steps"
          tone="error"
        /> : null}
        {showStepAction ? <Button loading={status === 'checking' || status === 'requesting'} onPress={() => void requestStepAccess()} trailing={<Ionicons color={semanticColors.contentOnBrand} name="arrow-forward" size={iconSizes.md} />}>
          {getTrackingButtonText(status)}
        </Button> : null}

        <SectionHeader
          action={
            <Pressable accessibilityRole="button" onPress={() => router.push('/circle')}>
              <AppText tone="link" variant="label">{walkingCircle ? `${circleDetails?.members.length ?? 0} members` : 'Find a circle'}</AppText>
            </Pressable>
          }
          title="Your circle today"
        />
        {walkingCircle ? <Surface padding="lg" radius="lg" variant="card">
          <View style={styles.circleHeader}>
            <View style={styles.circleIcon}><Ionicons color={semanticColors.contentOnBrand} name="people" size={iconSizes.md} /></View>
            <View style={styles.circleCopy}>
              <AppText numberOfLines={1} variant="titleSmall">{walkingCircle.circle.name}</AppText>
              <AppText tone="secondary" variant="bodySmall">{getCircleStatusLabel(walkingCircle.circle.visibility)} · {walkingCircle.circle.memberCount}/20 members</AppText>
            </View>
            {isScoreReady ? <Badge tone={yourRank === 1 ? 'brand' : 'info'}>{`${getOrdinalSuffix(yourRank)} place`}</Badge> : <Badge tone="neutral">Syncing</Badge>}
          </View>
          <Divider />
          <View style={styles.circleFooter}>
            <CircleAvatarStack members={circleDetails?.members ?? []} />
            <Button onPress={() => router.push({ pathname: '/circle/[circleId]', params: { circleId: walkingCircle.circle.id } })} size="small" trailing={<Ionicons color={semanticColors.contentOnBrand} name="arrow-forward" size={iconSizes.sm} />}>
              View standings
            </Button>
          </View>
        </Surface> : <StateCard
          actionLabel="Find a circle"
          description="Create a private circle for friends or discover a public walking circle nearby."
          icon={<Ionicons color={semanticColors.contentLink} name="people-outline" size={iconSizes.md} />}
          onAction={() => router.push('/circle')}
          title="Your steps are better together"
        />}
      </ScrollView>
      <CelebrationSheet
        body={`You reached ${formatSteps(goal)} steps today. ${streak.summary.currentStreak > 1 ? `Your ${streak.summary.currentStreak}-day streak is still going.` : 'That is one strong day of movement.'}`}
        onDismiss={dailyGoalCelebration.dismiss}
        primaryLabel="Keep moving"
        title="Daily goal reached"
        visible={dailyGoalCelebration.isVisible}
      />
    </>
  );
}

function Stat({ icon, label, value }: { icon: 'goal' | 'streak'; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, icon === 'streak' && styles.statIconWarm]}>
        <Ionicons color={icon === 'streak' ? palette.coral[600] : semanticColors.contentLink} name={icon === 'streak' ? 'flame' : 'locate-outline'} size={iconSizes.sm} />
      </View>
      <AppText selectable variant="label">{value}</AppText>
      <AppText tone="tertiary" variant="eyebrow">{label}</AppText>
    </View>
  );
}

function CircleAvatarStack({ members }: { members: CircleMember[] }) {
  return (
    <View accessibilityLabel={`${members.length} circle members`} style={styles.avatarStack}>
      {members.slice(0, 4).map((member, index) => <View key={member.userId} style={[styles.stackAvatar, { zIndex: members.length - index, marginLeft: index === 0 ? 0 : -10 }]}><DicebearAvatar choice={{ seed: member.avatarSeed, style: member.avatarStyle }} fallback={member.displayName[0]?.toUpperCase() ?? 'S'} size={34} /></View>)}
      {members.length > 4 ? <View style={[styles.moreAvatar, { marginLeft: -10 }]}><AppText tone="secondary" variant="label">+{members.length - 4}</AppText></View> : null}
    </View>
  );
}

function StepIllustration() {
  return (
    <View pointerEvents="none" style={styles.illustration}>
      <View style={styles.sun} />
      <View style={styles.hillBack} />
      <View style={styles.hillFront} />
      <View style={styles.path} />
      <View style={[styles.tree, styles.treeOne]}><View style={styles.treeTop} /><View style={styles.treeTrunk} /></View>
      <View style={[styles.tree, styles.treeTwo]}><View style={styles.treeTop} /><View style={styles.treeTrunk} /></View>
    </View>
  );
}

function getGreetingInfo(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return { color: palette.peach[500], icon: 'sunny-outline' as const, label: 'Good morning' };
  if (hour < 18) return { color: palette.coral[500], icon: 'partly-sunny-outline' as const, label: 'Good afternoon' };
  return { color: palette.lavender[700], icon: 'moon-outline' as const, label: 'Good evening' };
}

function getHealthSourceLabel(source: string) {
  if (source === 'healthkit') return 'Apple Health';
  if (source === 'health-connect') return 'Health Connect';
  return 'your health data';
}

function getSyncStatusLabel(input: {
  savedSteps: number | null;
  source: string;
  status: StepTrackingStatus;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
}) {
  if (input.syncStatus === 'saving') return 'Syncing your latest steps…';
  if (input.syncStatus === 'error') return 'Your latest step total could not be saved yet.';
  if (input.status === 'checking') return 'Checking your health data…';
  if (input.status === 'requesting') return `Connecting to ${getHealthSourceLabel(input.source)}…`;
  if (input.status === 'ready' && input.savedSteps === null) return 'Connect your health data to start.';
  return `Synced from ${getHealthSourceLabel(input.source)}`;
}

function getCircleStatusLabel(visibility: 'private' | 'public') {
  return visibility === 'public' ? 'Public circle' : 'Private circle';
}

function getOrdinalSuffix(value: number) {
  if (value % 100 >= 11 && value % 100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

function getTrackingButtonText(status: StepTrackingStatus) {
  if (status === 'checking') return 'Checking your step sensor';
  if (status === 'requesting') return 'Requesting step access';
  if (status === 'denied') return 'Try step tracking again';
  if (status === 'error') return 'Try step tracking again';
  return 'Enable step tracking';
}

const styles = StyleSheet.create({
  page: { backgroundColor: semanticColors.canvas },
  content: { gap: spacing.lg, padding: layout.contentPadding, paddingBottom: layout.bottomSafePadding },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  topBarActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  intro: { gap: spacing.xs, paddingTop: spacing.sm },
  greetingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  heroCard: { overflow: 'hidden' },
  heroCopy: { padding: spacing.xxl, paddingTop: spacing.xxl + spacing.sm },
  stepNumberRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  stepNumber: { color: semanticColors.contentPrimary, fontVariant: ['tabular-nums'] },
  stepUnit: { paddingBottom: spacing.xs },
  goalPanel: { backgroundColor: semanticColors.softLime, borderRadius: radii.md, gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg },
  goalPanelHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  goalCopy: { flex: 1, gap: spacing.xs },
  statGrid: { flexDirection: 'row', gap: spacing.section, padding: spacing.xxl, paddingTop: spacing.none },
  stat: { alignItems: 'flex-start', gap: spacing.xs, minWidth: 90 },
  statIcon: { alignItems: 'center', backgroundColor: semanticColors.infoSurface, borderRadius: radii.pill, height: 28, justifyContent: 'center', width: 28 },
  statIconWarm: { backgroundColor: semanticColors.warningSurface },
  syncRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: spacing.lg },
  circleHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  circleIcon: { alignItems: 'center', backgroundColor: semanticColors.brandAction, borderRadius: radii.md, height: 44, justifyContent: 'center', width: 44 },
  circleCopy: { flex: 1, gap: spacing.xs },
  circleFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  avatarStack: { alignItems: 'center', flexDirection: 'row' },
  stackAvatar: { backgroundColor: semanticColors.card, borderColor: semanticColors.card, borderRadius: 20, borderWidth: 2, height: 38, overflow: 'hidden', width: 38 },
  moreAvatar: { alignItems: 'center', backgroundColor: semanticColors.soft, borderColor: semanticColors.card, borderRadius: 20, borderWidth: 2, height: 38, justifyContent: 'center', width: 38 },
  illustration: { backgroundColor: palette.sky[100], height: 116, overflow: 'hidden', position: 'relative' },
  sun: { backgroundColor: palette.peach[300], borderRadius: 40, height: 80, position: 'absolute', right: 26, top: -28, width: 80 },
  hillBack: { backgroundColor: palette.lavender[300], borderTopLeftRadius: 90, borderTopRightRadius: 90, bottom: -43, height: 115, left: -24, position: 'absolute', transform: [{ rotate: '-10deg' }], width: 235 },
  hillFront: { backgroundColor: palette.lime[300], borderTopLeftRadius: 90, borderTopRightRadius: 90, bottom: -58, height: 116, position: 'absolute', right: -30, transform: [{ rotate: '12deg' }], width: 250 },
  path: { backgroundColor: palette.cream[50], borderRadius: 55, bottom: -34, height: 130, left: '43%', position: 'absolute', transform: [{ rotate: '15deg' }], width: 52 },
  tree: { bottom: 26, height: 50, position: 'absolute', width: 30 },
  treeOne: { left: 28 },
  treeTwo: { bottom: 18, left: 74, transform: [{ scale: 0.72 }] },
  treeTop: { backgroundColor: palette.ink[700], borderRadius: 20, height: 34, left: 0, position: 'absolute', top: 0, width: 30 },
  treeTrunk: { backgroundColor: palette.coral[600], height: 20, left: 12, position: 'absolute', top: 28, width: 6 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
