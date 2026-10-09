import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { useAuth } from '@/auth/auth-provider';
import type { CircleChatAuthor } from '@/domain/circle-chat';
import { CircleChatView } from '@/features/circles/circle-chat-view';
import { useCircleChat } from '@/hooks/use-circle-chat';
import { useCircleDetails } from '@/hooks/use-circle-details';

export default function CircleChatRoute() {
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const author = useMemo<CircleChatAuthor | undefined>(() => {
    const member = details?.members.find((item) => item.userId === user?.uid);
    if (!member) return undefined;
    return {
      avatarSeed: member.avatarSeed,
      avatarStyle: member.avatarStyle,
      displayName: member.displayName,
      id: member.userId,
    };
  }, [details?.members, user?.uid]);
  const chat = useCircleChat(circleId, author);

  if (status === 'loading') {
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
      onRetry={chat.retry}
      onRetryMessage={() => {}}
      onSend={async () => false}
      status="loading"
    />;
  }

  if (status === 'error' || !details || !author) {
    return <CircleChatView
      circleName="Circle chat"
      currentUserId={user?.uid ?? ''}
      error="This circle is unavailable. You may no longer be a member."
      hasMore={false}
      loadingOlder={false}
      memberCount={0}
      members={[]}
      messages={[]}
      onBack={() => router.back()}
      onLoadOlder={() => {}}
      onRetry={chat.retry}
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
    members={details.members}
    messages={chat.messages}
    onBack={() => router.back()}
    onLoadOlder={() => void chat.loadOlder()}
    onRetry={chat.retry}
    onRetryMessage={(messageId) => void chat.retryMessage(messageId)}
    onSend={chat.send}
    status={chat.status}
  />;
}
