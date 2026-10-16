import { useMemo, useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText, FixedHeaderScreen } from '@/components/ui';
import { Skeleton } from '@/components/skeleton';
import { radii, spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { useAuth } from '@/auth/auth-provider';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { deleteCircle, removeCircleMember } from '@/lib/circles';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function CircleActionsRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const [showCode, setShowCode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleShare() {
    if (!details) return;
    try {
      const message = details.circle.visibility === 'private' && details.circle.inviteCode
        ? `Join my Wakà circle “${details.circle.name}” with invite code ${details.circle.inviteCode}.`
        : `Find my public Wakà circle “${details.circle.name}” in the Circles tab.`;
      await Share.share({ message });
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

  function confirmDelete() {
    if (!details) return;
    Alert.alert(
      'Delete this circle?',
      `This removes “${details.circle.name}” for every member. It cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete circle', style: 'destructive', onPress: () => void deleteCurrentCircle() },
      ],
    );
  }

  async function deleteCurrentCircle() {
    if (!details) return;
    setIsDeleting(true);
    try {
      await deleteCircle({ circleId: details.circle.id });
      router.dismissAll();
    } catch (error) {
      Alert.alert('Could not delete circle', getMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  if (status === 'loading') return <ActionsSkeleton />;
  if (!details) return <View style={styles.loading}><AppText tone="secondary" variant="bodySmall">This circle is unavailable.</AppText></View>;

  const currentMember = details.members.find((member) => member.userId === user?.uid);
  const isCreator = details.circle.ownerId === user?.uid;
  const canReviewReports = currentMember?.role === 'owner' || currentMember?.role === 'moderator';

  return (
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<>
        <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons color={colors.ink} name="arrow-back" size={20} />
        </Pressable>
        </View>
        <View style={styles.header}>
          <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">{details.circle.name}</AppText>
          <AppText tone="secondary" variant="bodySmall">Circle details and settings</AppText>
        </View>
      </>}
      headerStyle={styles.fixedHeader}
      scrollViewProps={{ contentInsetAdjustmentBehavior: 'never' }}
    >

      <View style={styles.aboutCard}>
        <View style={styles.aboutHeading}>
          <View style={styles.infoIcon}><Ionicons color={colors.accentPressed} name={details.circle.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'} size={19} /></View>
          <View style={styles.infoCopy}>
            <AppText variant="label">About this circle</AppText>
            <AppText tone="secondary" variant="bodySmall">{details.circle.description.trim() || 'A group for sharing walking progress and planning walks together.'}</AppText>
          </View>
        </View>
        {details.circle.visibility === 'public' && details.circle.discoverableArea ? <AppText tone="secondary" variant="caption">Around {details.circle.discoverableArea}</AppText> : null}
        <View style={styles.aboutStats}>
          <View style={styles.aboutStat}>
            <AppText tone="tertiary" variant="eyebrow">VISIBILITY</AppText>
            <AppText variant="label">{details.circle.visibility === 'public' ? 'Public' : 'Private'}</AppText>
          </View>
          <View style={styles.aboutStat}>
            <AppText tone="tertiary" variant="eyebrow">WALKERS</AppText>
            <AppText variant="label">{details.circle.memberCount}</AppText>
          </View>
        </View>
      </View>

      <AppText variant="titleSmall">Circle settings</AppText>
      <View style={styles.actions}>
        <ActionRow caption={details.circle.visibility === 'private' ? 'Share an invite with people you trust' : 'Share this circle with a friend'} icon="person-add-outline" label="Invite friends" onPress={() => void handleShare()} />
        {details.circle.visibility === 'private' ? <ActionRow caption={showCode ? 'Hide the code from view' : 'Show the code for in-person invites'} icon="key-outline" label={showCode ? 'Hide invite code' : 'View invite code'} onPress={() => setShowCode((visible) => !visible)} /> : null}
        <ActionRow caption="Tell the circle’s owner and moderators about a safety concern" icon="flag-outline" label="Report this circle" onPress={() => router.push({ pathname: '/circle/[circleId]/report', params: { circleId: details.circle.id, targetId: details.circle.id, targetLabel: details.circle.name, targetType: 'circle' } })} />
        <ActionRow caption="See who is in this circle and manage safety controls" icon="people-outline" label="Circle members" onPress={() => router.push({ pathname: '/circle/[circleId]/members', params: { circleId: details.circle.id } })} />
        {canReviewReports ? <ActionRow caption="Review reports from circle members" icon="shield-checkmark-outline" label="Safety reports" onPress={() => router.push({ pathname: '/circle/[circleId]/reports', params: { circleId: details.circle.id } })} /> : null}
        {isCreator ? <>
          <ActionRow caption="Change its name or description" icon="create-outline" label="Edit circle" onPress={() => router.push({ pathname: '/circle/[circleId]/edit', params: { circleId: details.circle.id } })} />
        </> : null}
      </View>

      {showCode && details.circle.inviteCode ? (
        <View style={styles.codeCard}>
          <AppText tone="tertiary" variant="eyebrow">PRIVATE INVITE CODE</AppText>
          <AppText selectable style={styles.code} variant="title">{details.circle.inviteCode}</AppText>
          <AppText tone="secondary" variant="caption">Only share this code with people you trust.</AppText>
        </View>
      ) : null}

      <View style={styles.destructiveActions}>
        {isCreator ? <ActionRow destructive disabled={isDeleting} icon="trash-outline" label={isDeleting ? 'Deleting circle…' : 'Delete circle'} caption="Remove it for every member" onPress={confirmDelete} /> : <ActionRow destructive disabled={isLeaving} icon="exit-outline" label={isLeaving ? 'Leaving circle…' : 'Leave circle'} caption="You’ll stop seeing shared scores and activity" onPress={confirmLeave} />}
      </View>
    </FixedHeaderScreen>
  );
}

function ActionRow({ caption, destructive = false, disabled = false, icon, label, onPress }: {
  caption?: string;
  destructive?: boolean;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.actionRow, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
  >
    <View style={[styles.actionIcon, destructive && styles.destructiveIcon]}>
      <Ionicons color={destructive ? colors.dangerContent : colors.accentPressed} name={icon} size={19} />
    </View>
    <View style={styles.actionText}>
      <AppText style={destructive && styles.destructiveText} variant="label">{label}</AppText>
      {caption ? <AppText tone="secondary" variant="caption">{caption}</AppText> : null}
    </View>
    <Ionicons color={destructive ? colors.dangerContent : colors.muted} name="chevron-forward" size={18} />
  </Pressable>;
}

function ActionsSkeleton() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.skeletonPage}>
    <Skeleton style={{ alignSelf: 'center', height: 28, marginTop: 12, width: '60%' }} />
    <Skeleton style={{ alignSelf: 'center', height: 14, marginTop: 9, width: 132 }} />
    <View style={styles.skeletonActions}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><Skeleton style={{ height: 36, width: 36 }} /><View style={styles.skeletonCopy}><Skeleton style={{ height: 15, width: 132 }} /><Skeleton style={{ height: 12, marginTop: 8, width: 184 }} /></View></View>)}</View>
  </View>;
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  fixedHeader: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  content: { gap: spacing.md, paddingBottom: spacing.xxxl, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.xxl },
  nav: { flexDirection: 'row' },
  backButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  header: { gap: spacing.xs, paddingBottom: spacing.sm },
  title: { alignSelf: 'stretch', color: colors.ink, flexShrink: 1 },
  aboutCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  aboutHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  infoIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: radii.pill, height: 36, justifyContent: 'center', width: 36 },
  infoCopy: { flex: 1, gap: spacing.xs },
  aboutStats: { flexDirection: 'row', gap: spacing.sm },
  aboutStat: { backgroundColor: colors.soft, borderRadius: radii.md, flex: 1, gap: spacing.xs, padding: spacing.md },
  actions: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  actionRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, minHeight: 72, paddingHorizontal: spacing.md },
  actionIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: radii.pill, height: 38, justifyContent: 'center', width: 38 },
  actionText: { flex: 1, gap: 3, minWidth: 0 },
  destructiveActions: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  destructiveIcon: { backgroundColor: colors.dangerSurface },
  destructiveText: { color: colors.dangerContent },
  pressed: { backgroundColor: colors.soft },
  disabled: { opacity: 0.55 },
  codeCard: { backgroundColor: colors.soft, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.xs, padding: spacing.lg },
  code: { color: colors.ink, fontVariant: ['tabular-nums'], letterSpacing: 2.5, marginVertical: spacing.xs },
  skeletonPage: { backgroundColor: colors.background, flex: 1, gap: spacing.md, padding: spacing.xl },
  skeletonActions: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, marginTop: spacing.md, overflow: 'hidden' },
  skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 72, paddingHorizontal: spacing.md },
  skeletonCopy: { flex: 1, gap: spacing.xs, marginLeft: spacing.md },
}); }
