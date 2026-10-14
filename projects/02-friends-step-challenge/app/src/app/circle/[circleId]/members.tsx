import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText, FixedHeaderScreen, IconButton, StateCard } from '@/components/ui';
import { Skeleton } from '@/components/skeleton';
import { useBlockedPeople } from '@/hooks/use-blocked-people';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { blockPerson, setCircleMemberRole, unblockPerson } from '@/lib/circle-safety';
import { removeCircleMember, type CircleMember } from '@/lib/circles';
import type { CircleRole } from '@/domain/circles';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';

export default function CircleMembersRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const blocked = useBlockedPeople(user?.uid);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const currentMember = details?.members.find((member) => member.userId === user?.uid);
  const isOwner = currentMember?.role === 'owner';

  function reportMember(member: CircleMember) {
    if (!details) return;
    router.push({
      pathname: '/circle/[circleId]/report',
      params: { circleId: details.circle.id, targetId: member.userId, targetLabel: member.displayName, targetType: 'member' },
    });
  }

  function showMemberActions(member: CircleMember) {
    if (!details || member.userId === user?.uid || pendingId) return;
    const isBlocked = blocked.ids.has(member.userId);
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report member', onPress: () => reportMember(member) },
    ];
    if (blocked.status === 'ready') {
      buttons.push({
        text: isBlocked ? 'Unblock' : 'Block',
        style: isBlocked ? undefined : 'destructive',
        onPress: () => isBlocked ? void changeBlock(member, false) : confirmBlock(member),
      });
    }
    if (isOwner && member.role !== 'owner') {
      const nextRole = member.role === 'moderator' ? 'member' : 'moderator';
      buttons.push({
        text: nextRole === 'moderator' ? 'Make moderator' : 'Remove moderator role',
        onPress: () => confirmRoleChange(member, nextRole),
      });
      buttons.push({ text: 'Remove from circle', style: 'destructive', onPress: () => confirmRemove(member) });
    }
    Alert.alert(member.displayName, roleDescription(member.role), buttons);
  }

  function confirmBlock(member: CircleMember) {
    Alert.alert(
      `Block ${member.displayName}?`,
      'Their messages and standings will be hidden from your view. This does not remove them from the circle or delete messages already sent.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block person', style: 'destructive', onPress: () => void changeBlock(member, true) },
      ],
    );
  }

  function confirmRoleChange(member: CircleMember, role: Exclude<CircleRole, 'owner'>) {
    const label = role === 'moderator' ? 'Make moderator' : 'Remove moderator role';
    Alert.alert(`${label}?`, role === 'moderator'
      ? `${member.displayName} will be able to review safety reports for this circle.`
      : `${member.displayName} will no longer be able to review this circle’s safety reports.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: label, onPress: () => void changeRole(member, role) },
    ]);
  }

  function confirmRemove(member: CircleMember) {
    Alert.alert(`Remove ${member.displayName}?`, 'They will no longer see this circle or contribute new steps.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeMember(member) },
    ]);
  }

  async function changeBlock(member: CircleMember, shouldBlock: boolean) {
    if (!user || pendingId) return;
    setPendingId(member.userId);
    try {
      if (shouldBlock) await blockPerson({ blockedUserId: member.userId, displayName: member.displayName, userId: user.uid });
      else await unblockPerson({ blockedUserId: member.userId, userId: user.uid });
    } catch (error) {
      Alert.alert(shouldBlock ? 'Could not block person' : 'Could not unblock person', getMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  async function changeRole(member: CircleMember, role: Exclude<CircleRole, 'owner'>) {
    if (!details || pendingId) return;
    setPendingId(member.userId);
    try {
      await setCircleMemberRole({ circleId: details.circle.id, memberId: member.userId, role });
    } catch (error) {
      Alert.alert('Could not update member role', getMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  async function removeMember(member: CircleMember) {
    if (!details || pendingId) return;
    setPendingId(member.userId);
    try {
      await removeCircleMember({ circleId: details.circle.id, memberId: member.userId });
    } catch (error) {
      Alert.alert('Could not remove member', getMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  if (status === 'loading') return <MembersSkeleton />;

  return <FixedHeaderScreen
    backgroundColor={colors.background}
    header={<>
      <View style={styles.nav}><IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton></View>
      <AppText tone="tertiary" variant="eyebrow">CIRCLE SAFETY</AppText>
      <AppText accessibilityRole="header" style={styles.title} variant="title">Circle members</AppText>
      <AppText tone="secondary" variant="bodySmall">Report or block someone. The circle owner can appoint moderators and remove members.</AppText>
    </>}
    headerStyle={styles.header}
    contentContainerStyle={styles.body}
  >
    {status === 'error' || !details || !currentMember ? <StateCard description="This circle is unavailable, or you are no longer a member." title="Members unavailable" tone="error" /> : <>
      {blocked.status === 'error' ? <StateCard actionLabel="Retry" description="Your blocked-people list could not load, so block status is temporarily unavailable." onAction={blocked.retry} title="Safety list unavailable" tone="error" /> : null}
      <View style={styles.members}>
        {details.members.map((member) => <View key={member.userId} style={styles.member}>
          <Avatar member={member} />
          <View style={styles.memberText}>
            <AppText numberOfLines={1} style={styles.memberName} variant="label">{member.userId === user?.uid ? 'You' : member.displayName}</AppText>
            <AppText tone="secondary" variant="caption">{roleLabel(member.role)}{blocked.ids.has(member.userId) ? ' · Blocked by you' : ''}</AppText>
          </View>
          {member.userId !== user?.uid ? <Pressable
            accessibilityHint="Report or block this person. Circle owners can also change their role or remove them."
            accessibilityLabel={`Safety options for ${member.displayName}`}
            accessibilityRole="button"
            disabled={pendingId !== null}
            onPress={() => showMemberActions(member)}
            style={({ pressed }) => [styles.options, pressed && styles.pressed, pendingId === member.userId && styles.busy]}
          >
            {pendingId === member.userId ? <ActivityIndicator color={colors.accentPressed} size="small" /> : <Ionicons color={colors.ink} name="ellipsis-horizontal" size={20} />}
          </Pressable> : <View style={styles.selfBadge}><AppText tone="tertiary" variant="caption">You</AppText></View>}
        </View>)}
      </View>
      {isOwner ? <AppText tone="secondary" variant="caption">Moderators can review and resolve reports. Only you can appoint them or remove members.</AppText> : null}
    </>}
  </FixedHeaderScreen>;
}

function Avatar({ member }: { member: CircleMember }) {
  const initials = member.displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <DicebearAvatar choice={{ seed: member.avatarSeed, style: member.avatarStyle }} fallback={initials || 'SC'} size={44} />;
}

function MembersSkeleton() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.skeletonPage}><Skeleton style={{ height: 40, width: 40 }} /><Skeleton style={{ height: 12, marginTop: 26, width: 118 }} /><Skeleton style={{ height: 30, marginTop: 10, width: '68%' }} /><Skeleton style={{ height: 14, marginTop: 11, width: '88%' }} /><View style={styles.members}>{[0, 1, 2].map((item) => <View key={item} style={styles.member}><Skeleton style={{ borderRadius: 22, height: 44, width: 44 }} /><View style={styles.memberText}><Skeleton style={{ height: 14, width: '68%' }} /><Skeleton style={{ height: 11, marginTop: 7, width: '42%' }} /></View></View>)}</View></View>;
}

function roleLabel(role: CircleRole) {
  if (role === 'owner') return 'Circle owner';
  if (role === 'moderator') return 'Moderator';
  return 'Circle member';
}

function roleDescription(role: CircleRole) {
  if (role === 'owner') return 'Circle owner';
  if (role === 'moderator') return 'Moderator';
  return 'Circle member';
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  header: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
  nav: { flexDirection: 'row' },
  title: { color: colors.ink },
  body: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl, paddingTop: spacing.md },
  members: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  member: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 72, paddingHorizontal: spacing.md },
  memberText: { flex: 1, gap: 3, marginLeft: spacing.md, minWidth: 0 },
  memberName: { color: colors.ink },
  options: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  selfBadge: { alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  busy: { opacity: 0.6 },
  pressed: { backgroundColor: colors.soft },
  skeletonPage: { backgroundColor: colors.background, flex: 1, padding: spacing.xl },
}); }
