import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { Leaderboard } from '@/components/leaderboard';
import { AppText, SectionHeader, SegmentedControl, StateCard } from '@/components/ui';
import { type Friend } from '@/data/circle';
import { getDateKeyDaysBefore, getDateKeyInTimeZone, getWeekDateKeys } from '@/domain/dates';
import { aggregateCircleSteps, getRankMovement } from '@/features/circles/leaderboard-model';
import { CircleActivityLink } from '@/features/circles/circle-activity-link';
import { CircleChatIconButton } from '@/features/circles/circle-chat-icon-button';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { useCirclePeriodSteps } from '@/hooks/use-circle-period-steps';
import { useCircleChatUnreadCount } from '@/hooks/use-circle-chat-unread-count';
import { useBlockedPeople } from '@/hooks/use-blocked-people';
import { type CircleMember } from '@/lib/circles';
import { radii, spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';

const AVATAR_COLORS = ['#13B5E8', '#087CA5', '#317F1B', '#62C9EB', '#86B51B', '#F77768'];

type LeaderboardPeriod = 'today' | 'this-week';

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this-week' },
] as const satisfies readonly { label: string; value: LeaderboardPeriod }[];

export default function CircleDetailRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const blocked = useBlockedPeople(user?.uid);
  const chatUnread = useCircleChatUnreadCount(details?.circle.id, user?.uid);
  const competitionTimeZone = details?.circle.competitionTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDateKey = getDateKeyInTimeZone(new Date(), competitionTimeZone);
  const thisWeekDates = useMemo(
    () => getWeekDateKeys(currentDateKey).filter((dateKey) => dateKey <= currentDateKey),
    [currentDateKey],
  );
  const yesterdayDateKey = useMemo(() => getDateKeyDaysBefore(dateFromKey(currentDateKey), 'UTC', 1), [currentDateKey]);
  const previousWeekToDateDates = useMemo(
    () => thisWeekDates.map((dateKey) => getDateKeyDaysBefore(dateFromKey(dateKey), 'UTC', 7)),
    [thisWeekDates],
  );
  const trackedDateKeys = useMemo(
    () => Array.from(new Set([...thisWeekDates, yesterdayDateKey, ...previousWeekToDateDates])),
    [previousWeekToDateDates, thisWeekDates, yesterdayDateKey],
  );
  const { stepsByDate, status: leaderboardStatus } = useCirclePeriodSteps(details?.circle.id, trackedDateKeys, [currentDateKey]);
  const [period, setPeriod] = useState<LeaderboardPeriod>('today');
  const [selectedDateKeyOverride, setSelectedDateKeyOverride] = useState<string | null>(null);
  const activeDates = useMemo(
    () => period === 'today' ? [currentDateKey] : thisWeekDates,
    [currentDateKey, period, thisWeekDates],
  );
  const baselineDates = useMemo(
    () => period === 'today' ? [yesterdayDateKey] : previousWeekToDateDates,
    [period, previousWeekToDateDates, yesterdayDateKey],
  );
  const selectedDateKey = period === 'this-week' && selectedDateKeyOverride && activeDates.includes(selectedDateKeyOverride)
    ? selectedDateKeyOverride
    : currentDateKey;
  const visibleMembers = useMemo(() => (details?.members ?? []).filter((member) => (
    member.userId === user?.uid || (blocked.status === 'ready' && !blocked.ids.has(member.userId))
  )), [blocked.ids, blocked.status, details?.members, user?.uid]);
  const memberIds = useMemo(() => visibleMembers.map((member) => member.userId), [visibleMembers]);
  const activeTotals = useMemo(() => aggregateCircleSteps(activeDates, stepsByDate, memberIds), [activeDates, memberIds, stepsByDate]);
  const baselineTotals = useMemo(() => aggregateCircleSteps(baselineDates, stepsByDate, memberIds), [baselineDates, memberIds, stepsByDate]);
  const movement = useMemo(() => getRankMovement(activeTotals, baselineTotals), [activeTotals, baselineTotals]);
  const friends = useMemo(() => buildFriends(visibleMembers, activeTotals, user?.uid), [activeTotals, user?.uid, visibleMembers]);
  const dailyFriends = useMemo(() => buildFriends(visibleMembers, stepsByDate[selectedDateKey] ?? {}, user?.uid), [selectedDateKey, stepsByDate, user?.uid, visibleMembers]);

  if (status === 'loading') return <LoadingState />;

  if (status === 'error' || !details) {
    return <View style={styles.error}><AppText variant="titleSmall">This circle is unavailable</AppText><AppText tone="secondary" variant="bodySmall">It may have been removed, or you may no longer be a member.</AppText><Pressable onPress={() => router.back()} style={styles.backAction}><AppText tone="onBrand" variant="button">Back to circles</AppText></Pressable></View>;
  }

  return (
    <View style={styles.page}>
      <View testID="circle-fixed-header" style={[styles.fixedHeader, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.nav}>
          <View style={styles.navSide}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.roundButton}><Text style={styles.back}>‹</Text></Pressable></View>
          <AppText accessibilityRole="header" numberOfLines={2} style={styles.circleTitle} variant="titleSmall">{details.circle.name}</AppText>
          <View style={styles.navActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open circle options" onPress={() => router.push({ pathname: '/circle/[circleId]/actions', params: { circleId: details.circle.id } })} style={({ pressed }) => [styles.roundButton, styles.optionsButton, pressed && styles.buttonPressed]}>
              <Ionicons color={colors.ink} name="ellipsis-horizontal" size={23} />
            </Pressable>
          </View>
        </View>
        <SegmentedControl
          accessibilityLabel="Leaderboard period"
          items={PERIODS}
          onChange={(nextPeriod) => {
            setPeriod(nextPeriod);
            setSelectedDateKeyOverride(null);
          }}
          value={period}
          variant="surface"
        />
      </View>

      <ScrollView testID="circle-standings-scroll" contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 56 }]} showsVerticalScrollIndicator={false} style={styles.scroll}>
        {blocked.status === 'loading' ? <StateCard description="Loading your safety preferences before showing circle standings." title="Loading standings" /> : blocked.status === 'error' ? <StateCard actionLabel="Retry" description="We could not load your blocked-people list, so standings are hidden until it can be checked." onAction={blocked.retry} title="Standings unavailable" tone="error" /> : leaderboardStatus === 'loading' ? <LoadingRows /> : leaderboardStatus === 'error' ? <StateCard description="We could not load this circle's standings. Check your connection and try again." title="Standings unavailable" tone="error" /> : friends.length === 0 ? <StateCard description="Invite a few walkers to start comparing steps synced from your health data." title="No walkers yet" /> : <>
          <View style={styles.sectionHeader}>
            <AppText variant="titleSmall">{period === 'today' ? 'Today’s standings' : 'This week’s standings'}</AppText>
            <CircleActivityLink onPress={() => router.push({ pathname: '/circle/[circleId]/activity', params: { circleId: details.circle.id } })} />
          </View>
          <Leaderboard changes={movement} friends={friends} limit={3} podium="bars" podiumHeight={140} />
          {period === 'today' ? <Leaderboard friends={friends} podium="none" /> : null}

          {period === 'this-week' ? (
            <View style={styles.dailySection}>
              <SectionHeader title="Daily breakdown" />
              <ScrollView horizontal contentContainerStyle={styles.dayPicker} showsHorizontalScrollIndicator={false}>
                {activeDates.map((dateKey) => {
                  const day = getDayLabel(dateKey, competitionTimeZone, currentDateKey);
                  const selected = dateKey === selectedDateKey;
                  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={dateKey} onPress={() => setSelectedDateKeyOverride(dateKey)} style={({ pressed }) => [styles.day, selected && styles.dayActive, pressed && styles.dayPressed]}><AppText tone={selected ? 'onBrand' : 'secondary'} variant="caption">{day.label}</AppText><AppText style={[styles.dayDate, selected && styles.dayTextActive]}>{day.dayOfMonth}</AppText></Pressable>;
                })}
              </ScrollView>
              <Leaderboard friends={dailyFriends} podium="none" />
            </View>
          ) : null}
        </>}
      </ScrollView>
      <CircleChatIconButton
        moreMayBeUnread={chatUnread.moreMayBeUnread}
        onPress={() => router.push({ pathname: '/circle/[circleId]/chat', params: { circleId: details.circle.id } })}
        unreadCount={chatUnread.unreadCount}
        style={[styles.chatFloating, { bottom: Math.max(insets.bottom, spacing.lg) + spacing.md }]}
      />
    </View>
  );
}

function buildFriends(members: CircleMember[], steps: Record<string, number>, userId?: string): Friend[] {
  return members.map((member, index): Friend => ({
    avatar: { seed: member.avatarSeed, style: member.avatarStyle },
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    id: member.userId,
    initials: getInitials(member.displayName),
    isYou: member.userId === userId,
    name: member.userId === userId ? 'You' : member.displayName,
    steps: steps[member.userId] ?? 0,
  })).sort((first, second) => second.steps - first.steps || (first.id ?? '').localeCompare(second.id ?? ''));
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function getDayLabel(dateKey: string, timeZone: string, currentDateKey: string) {
  const isToday = dateKey === currentDateKey;
  const yesterday = getDateKeyDaysBefore(new Date(), timeZone, 1);
  const label = isToday ? 'Today' : dateKey === yesterday ? 'Yesterday' : new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'short' }).format(dateFromKey(dateKey));
  return { dayOfMonth: Number(dateKey.slice(-2)), label };
}

function LoadingState() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.loading}><View style={styles.detailSkeleton}><SkeletonBlock colors={colors} height={40} width={40} /><SkeletonBlock colors={colors} height={12} marginTop={28} width={122} /><SkeletonBlock colors={colors} height={30} marginTop={10} width="72%" /><SkeletonBlock colors={colors} height={14} marginTop={10} width="58%" /><SkeletonBlock colors={colors} height={52} marginTop={28} width="100%" /><LoadingRows /></View></View>;
}

function LoadingRows() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.leaderboardSkeleton}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><SkeletonBlock colors={colors} height={36} width={36} /><View style={styles.skeletonCopy}><SkeletonBlock colors={colors} height={14} width="68%" /><SkeletonBlock colors={colors} height={11} marginTop={7} width="42%" /></View><SkeletonBlock colors={colors} height={14} width={44} /></View>)}</View>;
}

function SkeletonBlock({ colors, height, marginTop, width }: { colors: ReturnType<typeof useAppColors>; height: number; marginTop?: number; width: number | `${number}%` }) {
  return <View style={{ backgroundColor: colors.borderSubtle, borderRadius: 8, height, marginTop, width }} />;
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    page: { backgroundColor: colors.background, flex: 1 },
    fixedHeader: { backgroundColor: colors.background, gap: spacing.lg, paddingBottom: spacing.md, paddingHorizontal: spacing.xxl, zIndex: 1 },
    scroll: { flex: 1 },
    content: { gap: spacing.lg, paddingHorizontal: spacing.xxl, paddingTop: spacing.md, paddingBottom: 56 },
    loading: { backgroundColor: colors.background, flex: 1 },
    detailSkeleton: { gap: spacing.md, padding: spacing.xxl },
    leaderboardSkeleton: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
    skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: spacing.lg },
    skeletonCopy: { flex: 1, gap: spacing.xs, marginLeft: spacing.md },
    nav: { alignItems: 'center', flexDirection: 'row' },
    navSide: { alignItems: 'flex-start', width: 44 },
    navActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', width: 44 },
    roundButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    back: { color: colors.ink, fontSize: 32, fontWeight: '300', lineHeight: 34 },
    buttonPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
    optionsButton: { padding: 0 },
    circleTitle: { flex: 1, minWidth: 0, paddingHorizontal: spacing.md, textAlign: 'center' },
    chatFloating: { elevation: 8, position: 'absolute', right: spacing.xl, shadowColor: colors.ink, shadowOffset: { height: 3, width: 0 }, shadowOpacity: 0.2, shadowRadius: 8, zIndex: 8 },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    dailySection: { gap: spacing.md, marginTop: spacing.sm },
    dayPicker: { gap: spacing.sm },
    day: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, minWidth: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    dayActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    dayDate: { color: colors.ink, fontVariant: ['tabular-nums'], fontWeight: '800', marginTop: 2 },
    dayTextActive: { color: colors.accentPressed },
    dayPressed: { opacity: 0.75 },
    error: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xxl },
    backAction: { backgroundColor: colors.accent, borderRadius: radii.md, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  });
}
