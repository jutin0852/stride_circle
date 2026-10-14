import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import type { CircleChatAuthor } from '@/domain/circle-chat';
import { CircleChatView } from '@/features/circles/circle-chat-view';
import { useCircleChat } from '@/hooks/use-circle-chat';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { useBlockedPeople } from '@/hooks/use-blocked-people';
import { blockPerson, unblockPerson } from '@/lib/circle-safety';
import { markCircleChatReadAt } from '@/services/circles/circle-chat-read-state';
import { circleChatReadStorage } from '@/services/circles/circle-chat-read-storage';

export default function CircleChatRoute() {
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const userId = user?.uid;
  const { details, status } = useCircleDetails(circleId);
  const blocked = useBlockedPeople(userId);
  const author = useMemo<CircleChatAuthor | undefined>(() => {
    const member = details?.members.find((item) => item.userId === userId);
    if (!member) return undefined;
    return {
      avatarSeed: member.avatarSeed,
      avatarStyle: member.avatarStyle,
      displayName: member.displayName,
      id: member.userId,
    };
  }, [details?.members, userId]);
  const chat = useCircleChat(circleId, author);
  const visibleMessages = useMemo(
    () => chat.messages.filter((message) => message.author.id === userId || !blocked.ids.has(message.author.id)),
    [blocked.ids, chat.messages, userId],
  );
  const visibleMembers = useMemo(
    () => (details?.members ?? []).filter((member) => member.userId === userId || !blocked.ids.has(member.userId)),
    [blocked.ids, details?.members, userId],
  );
  const retryBlocked = blocked.retry;
  const retryChat = chat.retry;
  const retry = useCallback(() => { retryChat(); retryBlocked(); }, [retryBlocked, retryChat]);

  const reportMessage = useCallback((messageId: string, targetLabel: string, targetPreview: string) => {
    if (!circleId) return;
    router.push({ pathname: '/circle/[circleId]/report', params: {
      circleId,
      targetId: messageId,
      targetLabel,
      targetPreview,
      targetType: 'message',
    } });
  }, [circleId]);

  const reportMember = useCallback((memberId: string, targetLabel: string) => {
    if (!circleId) return;
    router.push({ pathname: '/circle/[circleId]/report', params: {
      circleId,
      targetId: memberId,
      targetLabel,
      targetType: 'member',
    } });
  }, [circleId]);

  const handleBlockMember = useCallback((memberId: string, displayName: string, shouldBlock: boolean) => {
    if (!user) return;
    const apply = async () => {
      try {
        if (shouldBlock) await blockPerson({ blockedUserId: memberId, displayName, userId: user.uid });
        else await unblockPerson({ blockedUserId: memberId, userId: user.uid });
      } catch (error) {
        Alert.alert(shouldBlock ? 'Could not block person' : 'Could not unblock person', error instanceof Error ? error.message : 'Please try again.');
      }
    };
    if (!shouldBlock) {
      void apply();
      return;
    }
    Alert.alert(
      `Block ${displayName}?`,
      'Their messages and standings will be hidden from your view. This does not remove them from the circle or delete messages already sent.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block person', style: 'destructive', onPress: () => void apply() },
      ],
    );
  }, [user]);

  useFocusEffect(useCallback(() => {
    if (!circleId || !userId || chat.status !== 'ready' || blocked.status !== 'ready') return undefined;
    const latest = visibleMessages.reduce<Date | null>((mostRecent, message) => (
      !mostRecent || message.createdAt > mostRecent ? message.createdAt : mostRecent
    ), null);
    if (latest) void markCircleChatReadAt(circleChatReadStorage, userId, circleId, latest).catch(() => {});
    return undefined;
  }, [blocked.status, chat.status, circleId, userId, visibleMessages]));

  if (status === 'loading' || blocked.status === 'loading') {
    return <CircleChatView
      circleName={details?.circle.name ?? 'Circle chat'}
      currentUserId={user?.uid ?? ''}
      error={null}
      hasMore={false}
      loadingOlder={false}
      memberCount={0}
      members={[]}
      messages={[]}
      onBack={() => router.back()}
      onLoadOlder={() => {}}
      onRetry={retry}
      onRetryMessage={() => {}}
      onSend={async () => false}
      status="loading"
    />;
  }

  if (status === 'error' || !details || !author || blocked.status === 'error') {
    return <CircleChatView
      circleName="Circle chat"
      currentUserId={user?.uid ?? ''}
      error={blocked.status === 'error' ? 'Your safety settings could not load. Retry to safely display circle messages.' : 'This circle is unavailable. You may no longer be a member.'}
      hasMore={false}
      loadingOlder={false}
      memberCount={0}
      members={[]}
      messages={[]}
      onBack={() => router.back()}
      onLoadOlder={() => {}}
      onRetry={retry}
      onRetryMessage={() => {}}
      onSend={async () => false}
      status="error"
    />;
  }

  return <CircleChatView
    circleName={details.circle.name}
    currentUserId={user?.uid ?? ''}
    error={chat.error}
    hasMore={chat.hasMore}
    loadingOlder={chat.loadingOlder}
    memberCount={details.circle.memberCount || details.members.length}
    members={visibleMembers}
    messages={visibleMessages}
    onBack={() => router.back()}
    onLoadOlder={() => void chat.loadOlder()}
    onRetry={chat.retry}
    onRetryMessage={(messageId) => void chat.retryMessage(messageId)}
    onSend={chat.send}
    blockedUserIds={blocked.ids}
    onReportMessage={(message) => reportMessage(message.id, message.author.displayName, message.body)}
    onReportMember={(member) => reportMember(member.userId, member.displayName)}
    onBlockMember={(member, shouldBlock) => handleBlockMember(member.userId, member.displayName, shouldBlock)}
    status={chat.status}
  />;
}
