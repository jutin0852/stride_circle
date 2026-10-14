import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { firebaseCircleChatRepository } from '@/data/firebase/circle-chat-repository';
import {
  countUnreadCircleMessages,
  getCircleChatReadAt,
  markCircleChatReadAt,
} from '@/services/circles/circle-chat-read-state';
import { circleChatReadStorage } from '@/services/circles/circle-chat-read-storage';

export function useCircleChatUnreadCount(circleId: string | undefined, userId: string | undefined) {
  const scopeKey = circleId && userId ? `${circleId}:${userId}` : null;
  const [state, setState] = useState<{ count: number; moreMayBeUnread: boolean; scopeKey: string | null }>({
    count: 0,
    moreMayBeUnread: false,
    scopeKey: null,
  });

  useFocusEffect(useCallback(() => {
    if (!circleId || !userId || !scopeKey) return undefined;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      let readAt = await getCircleChatReadAt(circleChatReadStorage, userId, circleId);
      if (!active) return;
      // Existing chats predate read cursors; start from now so old history is not presented as newly unread.
      if (!readAt) {
        readAt = new Date().toISOString();
        await markCircleChatReadAt(circleChatReadStorage, userId, circleId, new Date(readAt));
      }
      if (!active) return;
      const readCursor = readAt;
      unsubscribe = firebaseCircleChatRepository.subscribeToUnread(circleId, new Date(readCursor), (page) => {
        if (!active) return;
        const unread = countUnreadCircleMessages(page.messages, readCursor, page);
        setState({ ...unread, scopeKey });
      }, () => {
        if (active) setState((previous) => previous.scopeKey === scopeKey ? previous : { count: 0, moreMayBeUnread: false, scopeKey });
      });
    })().catch(() => {
      if (active) setState((previous) => previous.scopeKey === scopeKey ? previous : { count: 0, moreMayBeUnread: false, scopeKey });
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [circleId, scopeKey, userId]));

  const unread = state.scopeKey === scopeKey ? state : { count: 0, moreMayBeUnread: false, scopeKey };
  return {
    unreadCount: unread.count,
    moreMayBeUnread: unread.moreMayBeUnread,
    markRead: useCallback((date: Date) => {
      if (circleId && userId) void markCircleChatReadAt(circleChatReadStorage, userId, circleId, date).catch(() => {});
    }, [circleId, userId]),
  };
}
