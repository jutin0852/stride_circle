import { useCallback, useEffect, useState } from 'react';

import {
  createCircleMessageId,
  normalizeCircleMessageBody,
  validateCircleMessageBody,
  type CircleChatAuthor,
  type CircleMessage,
  type CircleMessageCursor,
} from '@/domain/circle-chat';
import { firebaseCircleChatRepository, type CircleMessagePage } from '@/data/firebase/circle-chat-repository';

export type CircleChatStatus = 'idle' | 'loading' | 'ready' | 'error';

type CircleChatState = {
  error: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  messages: CircleMessage[];
  oldestCursor: CircleMessageCursor | null;
  scopeKey: string | null;
  status: CircleChatStatus;
};

const initialState: CircleChatState = {
  error: null,
  hasMore: false,
  loadingOlder: false,
  messages: [],
  oldestCursor: null,
  scopeKey: null,
  status: 'idle',
};

function sortMessages(messages: Iterable<CircleMessage>) {
  return Array.from(new Map(Array.from(messages, (message) => [message.id, message])).values())
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
}

function olderCursor(first: CircleMessageCursor | null, second: CircleMessageCursor | null) {
  if (!first) return second;
  if (!second) return first;
  return new Date(first.createdAt).getTime() <= new Date(second.createdAt).getTime() ? first : second;
}

function mergePage(previous: CircleChatState, page: CircleMessagePage, preservePagination = false, scopeKey = previous.scopeKey): CircleChatState {
  return {
    ...previous,
    error: null,
    hasMore: preservePagination && previous.status !== 'loading' ? previous.hasMore : page.hasMore,
    loadingOlder: false,
    messages: sortMessages([...previous.messages, ...page.messages]),
    oldestCursor: olderCursor(previous.oldestCursor, page.oldestCursor),
    scopeKey,
    status: 'ready',
  };
}

export function useCircleChat(circleId: string | undefined, author: CircleChatAuthor | undefined) {
  const [state, setState] = useState<CircleChatState>(initialState);
  const [revision, setRevision] = useState(0);
  const scopeKey = circleId && author ? `${circleId}:${author.id}` : null;

  useEffect(() => {
    if (!scopeKey || !circleId || !author) {
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = firebaseCircleChatRepository.subscribeToLatest(
        circleId,
        (page) => {
          if (active) setState((previous) => mergePage(previous, page, true, scopeKey));
        },
        () => {
          if (active) setState((previous) => ({ ...previous, error: 'The circle chat could not load. Check your connection and try again.', scopeKey, status: 'error' }));
        },
      );
    } catch {
      queueMicrotask(() => {
        if (active) setState((previous) => ({ ...previous, error: 'The circle chat could not load. Check your connection and try again.', scopeKey, status: 'error' }));
      });
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [author, circleId, revision, scopeKey]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);

  const loadOlder = useCallback(async () => {
    if (!circleId || !state.oldestCursor || !state.hasMore || state.loadingOlder) return;
    setState((previous) => ({ ...previous, loadingOlder: true }));
    try {
      const page = await firebaseCircleChatRepository.loadOlder(circleId, state.oldestCursor);
      setState((previous) => mergePage(previous, page));
    } catch {
      setState((previous) => ({ ...previous, error: 'Older messages could not load. Try again.', loadingOlder: false }));
    }
  }, [circleId, state.hasMore, state.loadingOlder, state.oldestCursor]);

  const send = useCallback(async (value: string) => {
    if (!circleId || !author) return false;
    const validationError = validateCircleMessageBody(value);
    if (validationError) {
      setState((previous) => ({ ...previous, error: validationError }));
      return false;
    }

    const body = normalizeCircleMessageBody(value);
    const messageId = createCircleMessageId();
    const optimisticMessage: CircleMessage = {
      author,
      body,
      circleId,
      createdAt: new Date(),
      id: messageId,
      status: 'pending',
    };
    setState((previous) => ({ ...previous, error: null, messages: sortMessages([...previous.messages, optimisticMessage]) }));

    try {
      await firebaseCircleChatRepository.send({ author, body, circleId, messageId });
      setState((previous) => ({ ...previous, messages: previous.messages.map((message) => message.id === messageId ? { ...message, status: 'sent' } : message) }));
      return true;
    } catch {
      setState((previous) => ({ ...previous, error: 'Your message could not send. You can retry it below.', messages: previous.messages.map((message) => message.id === messageId ? { ...message, status: 'error' } : message) }));
      return false;
    }
  }, [author, circleId]);

  const retryMessage = useCallback(async (messageId: string) => {
    if (!circleId || !author) return;
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) return;
    setState((previous) => ({ ...previous, error: null, messages: previous.messages.map((item) => item.id === messageId ? { ...item, status: 'pending' } : item) }));
    try {
      await firebaseCircleChatRepository.send({ author, body: message.body, circleId, messageId });
      setState((previous) => ({ ...previous, messages: previous.messages.map((item) => item.id === messageId ? { ...item, status: 'sent' } : item) }));
    } catch {
      setState((previous) => ({ ...previous, error: 'Your message could not send. Try again.', messages: previous.messages.map((item) => item.id === messageId ? { ...item, status: 'error' } : item) }));
    }
  }, [author, circleId, state.messages]);

  const viewState = !scopeKey ? initialState : state.scopeKey === scopeKey ? state : { ...initialState, scopeKey, status: 'loading' as const };
  return { ...viewState, loadOlder, retry, retryMessage, send };
}
