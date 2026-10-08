import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Leaderboard } from '@/components/leaderboard';
import { AppText, SegmentedControl, StateCard, Surface } from '@/components/ui';
import { type Friend, formatSteps } from '@/data/circle';
import { type GlobalLeaderboardEntry, type GlobalLeaderboardPeriod } from '@/domain/global-leaderboard';
import { spacing, radii } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';

const PERIODS = [
  { label: 'This Week', value: 'week' },
  { label: 'All Time', value: 'all-time' },
] as const satisfies readonly { label: string; value: GlobalLeaderboardPeriod }[];

const AVATAR_COLORS = ['#13B5E8', '#087CA5', '#317F1B', '#62C9EB', '#86B51B', '#F77768'];

export type GlobalLeaderboardViewProps = {
  currentUser: GlobalLeaderboardEntry | null;
  entries: GlobalLeaderboardEntry[];
  generatedAt: Date | null;
  onBack: () => void;
  onChangePeriod: (period: GlobalLeaderboardPeriod) => void;
  onRetry: () => void;
  period: GlobalLeaderboardPeriod;
  status: 'loading' | 'ready' | 'error';
};

export function GlobalLeaderboardView({ currentUser, entries, generatedAt, onBack, onChangePeriod, onRetry, period, status }: GlobalLeaderboardViewProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const friends = useMemo(() => buildFriends(entries, currentUser?.userId), [currentUser?.userId, entries]);

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" style={styles.page}>
      <View style={styles.nav}>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.roundButton}>
          <Ionicons color={colors.ink} name="arrow-back" size={21} />
        </Pressable>
        <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">Global leaderboard</AppText>
        <View style={styles.navSpacer} />
      </View>

      <View style={styles.intro}>
        <AppText variant="title">Walking worldwide</AppText>
        <AppText tone="secondary" variant="bodySmall">Compare verified walking steps with everyone on the app.</AppText>
      </View>

      <SegmentedControl
        accessibilityLabel="Global leaderboard period"
        items={PERIODS}
        onChange={onChangePeriod}
        value={period}
        variant="surface"
      />

      <View style={styles.metaRow}>
        <AppText tone="secondary" variant="caption">Walking · verified steps</AppText>
        {generatedAt ? <AppText tone="tertiary" variant="caption">Updated {formatGeneratedAt(generatedAt)}</AppText> : null}
      </View>

      {status === 'loading' ? <LoadingRows /> : null}
      {status === 'error' ? (
        <StateCard
          actionLabel="Try again"
          description="We could not load the global leaderboard. Check your connection and try again."
          onAction={onRetry}
          title="Leaderboard unavailable"
          tone="error"
        />
      ) : null}
      {status === 'ready' && friends.length === 0 ? (
        <StateCard
          description="Global standings will appear once walkers have verified steps."
          icon={<Ionicons color={colors.accentPressed} name="trophy-outline" size={22} />}
          title="No global standings yet"
        />
      ) : null}
      {status === 'ready' && friends.length > 0 ? (
        <View style={styles.results}>
          <View style={styles.sectionHeader}>
            <AppText variant="titleSmall">{period === 'week' ? 'This week’s walkers' : 'All-time walkers'}</AppText>
            <AppText tone="secondary" variant="caption">Top {friends.length}</AppText>
          </View>

          <Leaderboard friends={friends} limit={3} podium="bars" podiumHeight={140} />

          {currentUser ? <YourRankCard entry={currentUser} /> : null}

          <Leaderboard friends={friends} podium="none" />
        </View>
      ) : null}
    </ScrollView>
  );
}

function YourRankCard({ entry }: { entry: GlobalLeaderboardEntry }) {
  return (
    <Surface padding="lg" radius="md" style={stylesForRankCard.card} variant="soft">
      <View>
        <AppText tone="secondary" variant="caption">Your global position</AppText>
        <AppText variant="titleSmall">Rank #{entry.rank}</AppText>
      </View>
      <AppText tone="secondary" variant="bodySmall">{formatSteps(entry.verifiedSteps)} steps</AppText>
    </Surface>
  );
}

function buildFriends(entries: GlobalLeaderboardEntry[], userId?: string): Friend[] {
  return entries.map((entry, index) => ({
    avatar: entry.avatar,
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    id: entry.userId,
    initials: getInitials(entry.displayName),
    isYou: entry.userId === userId,
    name: entry.displayName,
    steps: entry.verifiedSteps,
  }));
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC';
}

function formatGeneratedAt(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function LoadingRows() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.loadingRows}>{[0, 1, 2].map((item) => <View key={item} style={styles.loadingRow}><View style={styles.loadingAvatar} /><View style={styles.loadingCopy}><View style={styles.loadingLine} /><View style={styles.loadingSmallLine} /></View><View style={styles.loadingValue} /></View>)}</View>;
}

const stylesForRankCard = StyleSheet.create({ card: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' } });

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    page: { backgroundColor: colors.background, flex: 1 },
    content: { gap: spacing.lg, paddingBottom: 56, paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
    nav: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    roundButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    navSpacer: { height: 44, width: 44 },
    title: { flex: 1, marginHorizontal: spacing.md, textAlign: 'center' },
    intro: { gap: spacing.xs },
    metaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.sm },
    results: { gap: spacing.lg },
    sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    loadingRows: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
    loadingRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: spacing.lg },
    loadingAvatar: { backgroundColor: colors.borderSubtle, borderRadius: 20, height: 40, width: 40 },
    loadingCopy: { flex: 1, gap: spacing.xs, marginLeft: spacing.md },
    loadingLine: { backgroundColor: colors.borderSubtle, borderRadius: 5, height: 13, width: '58%' },
    loadingSmallLine: { backgroundColor: colors.borderSubtle, borderRadius: 5, height: 9, width: '38%' },
    loadingValue: { backgroundColor: colors.borderSubtle, borderRadius: 5, height: 13, width: 44 },
  });
}
