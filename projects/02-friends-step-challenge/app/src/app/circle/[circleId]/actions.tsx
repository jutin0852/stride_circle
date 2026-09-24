import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Skeleton } from '@/components/skeleton';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { removeCircleMember } from '@/lib/circles';
import { colors } from '@/theme';

export default function CircleActionsRoute() {
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const [showCode, setShowCode] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleShare() {
    if (!details) return;
    try {
      await Share.share({ message: `Join my Stride Circle “${details.circle.name}” with invite code ${details.circle.inviteCode}.` });
    } catch {
      Alert.alert('Could not open sharing', 'Try again in a moment.');
    }
  }

  function confirmLeave() {
    if (!details || !user) return;
    Alert.alert('Leave this circle?', 'You will no longer see its shared scores or contribute new steps.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave circle', style: 'destructive', onPress: () => void leaveCircle() },
    ]);
  }

  async function leaveCircle() {
    if (!details || !user) return;
    setIsLeaving(true);
    try {
      await removeCircleMember({ circleId: details.circle.id, memberId: user.uid });
      router.dismissAll();
    } catch (error) {
      Alert.alert('Could not leave circle', getMessage(error));
    } finally {
      setIsLeaving(false);
    }
  }

  if (status === 'loading') return <ActionsSkeleton />;
  if (!details) return <View style={styles.loading}><Text style={styles.muted}>This circle is unavailable.</Text></View>;

  const isCreator = details.circle.ownerId === user?.uid;

  return (
    <View style={styles.page}>
      <View style={styles.grabber} />
      <Text style={styles.title}>{details.circle.name}</Text>
      <Text style={styles.subtitle}>Circle actions</Text>
      <View style={styles.actions}>
        <ActionRow label="Invite friends" caption="Share a private invite" onPress={() => void handleShare()} />
        <ActionRow label={showCode ? 'Hide invite code' : 'View invite code'} caption="Only share it with people you trust" onPress={() => setShowCode((visible) => !visible)} />
        {isCreator ? <>
          <ActionRow label="Edit circle" caption="Change its name or description" onPress={() => router.push({ pathname: '/circle/[circleId]/edit', params: { circleId: details.circle.id } })} />
          <ActionRow label="Manage members" caption="Remove people from this circle" onPress={() => router.push({ pathname: '/circle/[circleId]/members', params: { circleId: details.circle.id } })} />
        </> : null}
        {!isCreator ? <ActionRow destructive disabled={isLeaving} label={isLeaving ? 'Leaving circle…' : 'Leave circle'} onPress={confirmLeave} /> : null}
      </View>
      {showCode ? <View style={styles.codeCard}><Text style={styles.codeLabel}>PRIVATE INVITE CODE</Text><Text selectable style={styles.code}>{details.circle.inviteCode}</Text><Text style={styles.codeHint}>Anyone with this code can request to join your circle.</Text></View> : null}
    </View>
  );
}

function ActionRow({ caption, destructive = false, disabled = false, label, onPress }: { caption?: string; destructive?: boolean; disabled?: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionRow, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><View style={styles.actionText}><Text style={[styles.actionLabel, destructive && styles.destructive]}>{label}</Text>{caption ? <Text style={styles.actionCaption}>{caption}</Text> : null}</View><Text style={[styles.chevron, destructive && styles.destructive]}>›</Text></Pressable>;
}

function ActionsSkeleton() { return <View style={styles.skeletonPage}><Skeleton style={{ alignSelf: 'center', height: 5, width: 42 }} /><Skeleton style={{ height: 28, marginTop: 25, width: '60%' }} /><Skeleton style={{ height: 14, marginTop: 9, width: 112 }} /><View style={styles.skeletonActions}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><View><Skeleton style={{ height: 15, width: 132 }} /><Skeleton style={{ height: 12, marginTop: 8, width: 184 }} /></View><Skeleton style={{ height: 18, width: 18 }} /></View>)}</View></View>; }

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1, gap: 15, padding: 24 }, loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }, skeletonPage: { backgroundColor: colors.background, flex: 1, padding: 24 }, skeletonActions: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, marginTop: 24, overflow: 'hidden' }, skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 68, paddingHorizontal: 16 }, grabber: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 3, height: 5, width: 42 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 }, subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: -10 }, actions: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, overflow: 'hidden' }, actionRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 68, paddingHorizontal: 16 }, actionText: { flex: 1, gap: 3 }, actionLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' }, actionCaption: { color: colors.muted, fontSize: 12 }, chevron: { color: colors.muted, fontSize: 25 }, destructive: { color: '#B42318' }, codeCard: { backgroundColor: colors.soft, borderRadius: 18, gap: 5, padding: 17 }, codeLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, code: { color: colors.ink, fontSize: 23, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 2.5 }, codeHint: { color: colors.muted, fontSize: 12, lineHeight: 17 }, muted: { color: colors.muted, fontSize: 14 }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.55 },
});
