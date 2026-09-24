import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Leaderboard } from '@/components/leaderboard';
import { Skeleton } from '@/components/skeleton';
import { type Friend } from '@/data/circle';
import { useCircleDailySteps } from '@/hooks/use-circle-daily-steps';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { colors } from '@/theme';

const AVATAR_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#1D4ED8', '#0EA5E9', '#6366F1'];

export default function CircleDetailRoute() {
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const { steps, status: stepsStatus } = useCircleDailySteps(details?.circle.activityType === 'walk' ? details.circle.id : undefined);

  const friends = useMemo(
    () => (details?.members ?? []).map((member, index): Friend => ({
      avatar: { seed: member.avatarSeed, style: member.avatarStyle },
      color: AVATAR_COLORS[index % AVATAR_COLORS.length],
      initials: getInitials(member.displayName),
      isYou: member.userId === user?.uid,
      name: member.userId === user?.uid ? 'You' : member.displayName,
      steps: steps[member.userId] ?? 0,
    })).sort((first, second) => second.steps - first.steps),
    [details?.members, steps, user?.uid],
  );

  if (status === 'loading') return <LoadingState />;

  if (status === 'error' || !details) {
    return <View style={styles.error}><Text style={styles.errorTitle}>This circle is unavailable</Text><Text style={styles.errorText}>It may have been removed, or you may no longer be a member.</Text><Pressable onPress={() => router.back()} style={styles.backAction}><Text style={styles.backActionText}>Back to circles</Text></Pressable></View>;
  }

  const isWalking = details.circle.activityType === 'walk';

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.roundButton}><Text style={styles.back}>‹</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Circle actions" onPress={() => router.push({ pathname: '/circle/[circleId]/actions', params: { circleId: details.circle.id } })} style={styles.roundButton}><Text style={styles.more}>•••</Text></Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.activityType}>{isWalking ? 'WALKING CIRCLE' : 'RUNNING CIRCLE'}</Text>
        <Text style={styles.title}>{details.circle.name}</Text>
        <Text style={styles.description}>{details.members.length} {details.members.length === 1 ? 'member' : 'members'} moving together.</Text>
      </View>

      {isWalking ? <>
        <View style={styles.todayHeader}><Text style={styles.sectionTitle}>Today’s steps</Text><Text style={styles.todayDate}>LIVE</Text></View>
        {stepsStatus === 'loading' ? <LoadingRows /> : stepsStatus === 'error' ? <Text style={styles.muted}>We could not load today’s scores.</Text> : friends.length > 0 ? <Leaderboard friends={friends} /> : <Text style={styles.muted}>No members have joined yet.</Text>}
      </> : <View style={styles.comingSoon}><Text style={styles.comingSoonTitle}>Run recording is next</Text><Text style={styles.comingSoonText}>This circle is ready. Distance, pace, and live running scores will appear here when activity recording is added.</Text></View>}

    </ScrollView>
  );
}

function LoadingState() { return <View style={styles.loading}><View style={styles.detailSkeleton}><Skeleton style={{ height: 40, width: 40 }} /><Skeleton style={{ height: 12, marginTop: 28, width: 122 }} /><Skeleton style={{ height: 30, marginTop: 10, width: '72%' }} /><Skeleton style={{ height: 14, marginTop: 10, width: '58%' }} /><Skeleton style={{ height: 19, marginTop: 36, width: 132 }} /><View style={styles.leaderboardSkeleton}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><Skeleton style={{ borderRadius: 18, height: 36, width: 36 }} /><View style={styles.skeletonCopy}><Skeleton style={{ height: 14, width: '68%' }} /><Skeleton style={{ height: 11, marginTop: 7, width: '42%' }} /></View><Skeleton style={{ height: 14, width: 44 }} /></View>)}</View></View></View>; }
function LoadingRows() { return <View style={styles.leaderboardSkeleton}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><Skeleton style={{ borderRadius: 18, height: 36, width: 36 }} /><View style={styles.skeletonCopy}><Skeleton style={{ height: 14, width: '68%' }} /><Skeleton style={{ height: 11, marginTop: 7, width: '42%' }} /></View><Skeleton style={{ height: 14, width: 44 }} /></View>)}</View>; }
function getInitials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 16, padding: 24, paddingBottom: 40 }, loading: { backgroundColor: colors.background, flex: 1 }, detailSkeleton: { gap: 0, padding: 24 }, leaderboardSkeleton: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginTop: 14, overflow: 'hidden' }, skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: 15 }, skeletonCopy: { flex: 1, marginLeft: 11 },
  nav: { flexDirection: 'row', justifyContent: 'space-between' }, roundButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, back: { color: colors.ink, fontSize: 32, fontWeight: '300', lineHeight: 34 }, more: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: 1, marginTop: -7 },
  hero: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 25, borderWidth: 1, gap: 5, padding: 23 }, activityType: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -1 }, description: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  todayHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 8 }, todayDate: { color: colors.accentPressed, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, muted: { color: colors.muted, fontSize: 14, lineHeight: 20 }, loadingRows: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 68 },
  comingSoon: { backgroundColor: colors.soft, borderRadius: 20, gap: 5, padding: 19 }, comingSoonTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, comingSoonText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  error: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 9, justifyContent: 'center', padding: 24 }, errorTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, errorText: { color: colors.muted, fontSize: 14, textAlign: 'center' }, backAction: { backgroundColor: colors.accent, borderRadius: 14, marginTop: 8, paddingHorizontal: 16, paddingVertical: 12 }, backActionText: { color: '#FFFFFF', fontWeight: '800' },
});
