import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { AppText, Button, FixedHeaderScreen, IconButton, StateCard } from '@/components/ui';
import type { PublicProfile } from '@/domain/usernames';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { PersonRow } from '@/features/people/person-row';
import { usePeopleSearch } from '@/features/people/use-people-search';
import { useBlockedPeople } from '@/hooks/use-blocked-people';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { useFriends, usePublicProfile } from '@/hooks/use-people';
import {
  acceptFriendRequest,
  deleteCircleInvite,
  deleteFriendRequest,
  getPeopleErrorMessage,
  getPublicProfile,
  removeFriend,
  sendCircleInvite,
  sendFriendRequest,
  watchCircleInvites,
  type CircleInvite,
} from '@/lib/people';

/**
 * Find people. With a `circleId` it becomes "invite to this circle" for owners
 * and moderators: the person gets an invitation they accept, nobody is added silently.
 */
export default function PeopleRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId?: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const myProfile = usePublicProfile(user?.uid);
  const blocked = useBlockedPeople(user?.uid);
  const friends = useFriends(user?.uid);
  const circle = useCircleDetails(circleId);
  const [term, setTerm] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<CircleInvite[]>([]);
  const search = usePeopleSearch({ blockedIds: blocked.ids, selfId: user?.uid, term });

  const myRole = circle.status === 'ready' ? circle.details?.members.find((member) => member.userId === user?.uid)?.role : undefined;
  const canInvite = myRole === 'owner' || myRole === 'moderator';
  const memberIds = useMemo(() => new Set(circle.details?.members.map((member) => member.userId) ?? []), [circle.details]);
  const invitedIds = useMemo(() => new Set(pendingInvites.map((invite) => invite.inviteeId)), [pendingInvites]);
  const friendIds = useMemo(() => new Set(friends.friendIds), [friends.friendIds]);
  const outgoingIds = useMemo(() => new Set(friends.outgoing.map((request) => request.toId)), [friends.outgoing]);
  const incomingIds = useMemo(() => new Set(friends.incoming.map((request) => request.fromId)), [friends.incoming]);

  useEffect(() => {
    if (!circleId || !canInvite) return;
    return watchCircleInvites(circleId, setPendingInvites, () => setPendingInvites([]));
  }, [canInvite, circleId]);

  async function run(id: string, action: () => Promise<void>) {
    if (busyId) return;
    setBusyId(id);
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice(getPeopleErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(person: PublicProfile) {
    if (!user) return null;
    const busy = busyId === person.userId;
    if (circleId) {
      if (memberIds.has(person.userId)) return <AppText tone="tertiary" variant="caption">In circle</AppText>;
      if (invitedIds.has(person.userId)) return <AppText tone="tertiary" variant="caption">Invited</AppText>;
      return <Button disabled={!canInvite || !circle.details} loading={busy} onPress={() => void run(person.userId, async () => {
        if (!circle.details) return;
        await sendCircleInvite({ circleId, circleName: circle.details.circle.name, inviteeId: person.userId, inviter: user });
        setNotice(`Invitation sent to @${person.username}. They choose whether to join.`);
      })} size="small">Invite</Button>;
    }
    if (friendIds.has(person.userId)) return <AppText tone="tertiary" variant="caption">Friends</AppText>;
    if (outgoingIds.has(person.userId)) return <AppText tone="tertiary" variant="caption">Requested</AppText>;
    return <Button loading={busy} onPress={() => void run(person.userId, async () => {
      const outcome = await sendFriendRequest({ toId: person.userId, user });
      setNotice(outcome === 'accepted' ? `You and @${person.username} are now friends.` : `Friend request sent to @${person.username}.`);
    })} size="small" variant={incomingIds.has(person.userId) ? 'primary' : 'tertiary'}>{incomingIds.has(person.userId) ? 'Accept' : 'Add friend'}</Button>;
  }

  const hasUsername = myProfile.status === 'ready' && myProfile.value !== null;
  const searching = search.status !== 'idle';
  const requestBlocked = circleId && circle.status === 'ready' && !canInvite;

  return (
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
        <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">{circleId ? 'Invite by username' : 'Find people'}</AppText>
        <View style={styles.spacer} />
      </View>}
      headerStyle={styles.headerContainer}
      scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}
    >
      {circleId && circle.details ? (
        <AppText tone="secondary" variant="bodySmall">They get an invitation for {circle.details.circle.name} and join only if they accept.</AppText>
      ) : null}
      {requestBlocked ? <StateCard description="Only the owner and moderators can invite people by username." title="Invitations are limited" /> : null}

      {myProfile.status === 'ready' && !hasUsername ? (
        <StateCard actionLabel="Pick a username" description="Choose a username so friends can find you here and add you to circles." onAction={() => router.push('/username')} title="You are not findable yet" tone="info" />
      ) : null}

      {!circleId && friends.incoming.length > 0 ? (
        <View style={styles.section}>
          <AppText accessibilityRole="header" variant="titleSmall">Friend requests</AppText>
          {friends.incoming.map((request) => (
            <View key={request.id} style={styles.requestRow}>
              <AppText style={styles.requestName} variant="label">{request.fromDisplayName}</AppText>
              <Button loading={busyId === request.fromId} onPress={() => void run(request.fromId, () => acceptFriendRequest({ fromId: request.fromId, userId: user?.uid ?? '' }))} size="small">Accept</Button>
              <Button disabled={busyId === request.fromId} onPress={() => void run(request.fromId, () => deleteFriendRequest(request))} size="small" variant="tertiary">Decline</Button>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons color={colors.muted} name="search" size={19} />
        <TextInput
          accessibilityLabel="Search people"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(next) => { setTerm(next); setNotice(null); }}
          placeholder="Search by name or @username"
          placeholderTextColor={colors.placeholder}
          returnKeyType="search"
          style={styles.searchInput}
          value={term}
        />
      </View>
      {notice ? <AppText accessibilityLiveRegion="polite" tone="secondary" variant="caption">{notice}</AppText> : null}

      {searching ? (
        <View style={styles.section}>
          {search.status === 'loading' ? <AppText tone="tertiary" variant="caption">Searching…</AppText> : null}
          {search.status === 'error' ? <StateCard description="Search could not load. Check your connection and try again." title="Search unavailable" tone="error" /> : null}
          {search.status === 'ready' && search.results.length === 0 ? <StateCard description="No one matches that yet. People can also hide from search, so try their exact username." title="No people found" /> : null}
          {search.results.map((person) => <PersonRow actions={actionsFor(person)} key={person.userId} person={person} />)}
        </View>
      ) : (
        <AppText tone="tertiary" variant="caption">Type at least 2 characters. Search matches names and usernames.</AppText>
      )}

      {!searching ? (
        <View style={styles.section}>
          <AppText accessibilityRole="header" variant="titleSmall">{circleId ? 'Invite a friend' : 'Friends'}</AppText>
          {friends.status === 'loading' ? <AppText tone="tertiary" variant="caption">Loading friends…</AppText> : null}
          {friends.status === 'ready' && friends.friends.length === 0 ? <AppText tone="tertiary" variant="bodySmall">No friends yet. Search above to add someone.</AppText> : null}
          {friends.friends.map((friend) => (
            <PersonRow
              actions={circleId ? actionsFor(friend) : <Button disabled={busyId === friend.userId} onPress={() => void run(friend.userId, () => removeFriend({ friendId: friend.userId, userId: user?.uid ?? '' }))} size="small" variant="tertiary">Remove</Button>}
              key={friend.userId}
              person={friend}
            />
          ))}
        </View>
      ) : null}

      {circleId && canInvite && pendingInvites.length > 0 ? (
        <View style={styles.section}>
          <AppText accessibilityRole="header" variant="titleSmall">Pending invitations</AppText>
          {pendingInvites.map((invite) => (
            <PendingInviteRow busy={busyId === invite.id} invite={invite} key={invite.id} onCancel={() => void run(invite.id, () => deleteCircleInvite(invite))} />
          ))}
        </View>
      ) : null}
    </FixedHeaderScreen>
  );
}

function PendingInviteRow({ busy, invite, onCancel }: { busy: boolean; invite: CircleInvite; onCancel: () => void }) {
  const [person, setPerson] = useState<PublicProfile | null>(null);
  useEffect(() => {
    let active = true;
    getPublicProfile(invite.inviteeId).then((profile) => { if (active) setPerson(profile); }).catch(() => undefined);
    return () => { active = false; };
  }, [invite.inviteeId]);
  return person
    ? <PersonRow actions={<Button disabled={busy} onPress={onCancel} size="small" variant="tertiary">Cancel</Button>} person={person} />
    : <AppText tone="tertiary" variant="caption">Loading invitation…</AppText>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    headerContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
    title: { color: colors.ink, flex: 1, textAlign: 'center' },
    spacer: { width: 44 },
    content: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.xxxl },
    section: { gap: spacing.xs },
    searchBox: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 48, paddingHorizontal: 14 },
    searchInput: { color: colors.ink, flex: 1, fontSize: 15, minHeight: 44 },
    requestRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 56 },
    requestName: { flex: 1 },
  });
}
