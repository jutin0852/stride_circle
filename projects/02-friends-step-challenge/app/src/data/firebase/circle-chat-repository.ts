import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';
import { isAvatarStyle } from '@/lib/avatar';
import {
  MAX_CIRCLE_MESSAGE_LENGTH,
  type CircleChatAuthor,
  type CircleMessage,
  type CircleMessageCursor,
} from '@/domain/circle-chat';

export const CIRCLE_CHAT_PAGE_SIZE = 50;

export type CircleMessagePage = {
  messages: CircleMessage[];
  oldestCursor: CircleMessageCursor | null;
  hasMore: boolean;
};

export type CircleChatRepository = {
  subscribeToLatest: (circleId: string, onChange: (page: CircleMessagePage) => void, onError: (error: unknown) => void) => Unsubscribe;
  loadOlder: (circleId: string, cursor: CircleMessageCursor) => Promise<CircleMessagePage>;
  send: (input: { circleId: string; messageId: string; body: string; author: CircleChatAuthor }) => Promise<void>;
};

function getMessagesReference(circleId: string) {
  const db = requireFirebase(database, 'Firestore');
  return collection(db, 'circles', circleId, 'messages');
}

function getMessageQuery(circleId: string, cursor?: CircleMessageCursor) {
  const messages = getMessagesReference(circleId);
  const constraints = [orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(Timestamp.fromDate(new Date(cursor.createdAt)))] : []), limit(CIRCLE_CHAT_PAGE_SIZE)] as const;
  return query(messages, ...constraints);
}

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
}

function readMessage(circleId: string, snapshot: QueryDocumentSnapshot<DocumentData>) {
  const data = snapshot.data();
  const createdAt = toDate(data.createdAt);
  if (
    typeof data.body !== 'string'
    || !data.body.trim()
    || data.body.length > MAX_CIRCLE_MESSAGE_LENGTH
    || typeof data.authorId !== 'string'
    || typeof data.authorName !== 'string'
    || typeof data.authorAvatarSeed !== 'string'
    || !isAvatarStyle(data.authorAvatarStyle)
    || !createdAt
  ) return null;

  return {
    author: {
      avatarSeed: data.authorAvatarSeed,
      avatarStyle: data.authorAvatarStyle,
      displayName: data.authorName,
      id: data.authorId,
    },
    body: data.body,
    circleId,
    createdAt,
    id: snapshot.id,
    status: 'sent' as const,
  } satisfies CircleMessage;
}

function readPage(circleId: string, snapshots: readonly QueryDocumentSnapshot<DocumentData>[]): CircleMessagePage {
  const messages = snapshots.flatMap((snapshot) => {
    const message = readMessage(circleId, snapshot);
    return message ? [message] : [];
  }).sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime());
  const oldestSnapshot = snapshots[snapshots.length - 1];
  const oldestDate = oldestSnapshot ? toDate(oldestSnapshot.data().createdAt) : null;

  return {
    hasMore: snapshots.length === CIRCLE_CHAT_PAGE_SIZE && Boolean(oldestDate),
    messages,
    oldestCursor: oldestSnapshot && oldestDate ? { createdAt: oldestDate.toISOString(), id: oldestSnapshot.id } : null,
  };
}

export const firebaseCircleChatRepository: CircleChatRepository = {
  subscribeToLatest(circleId, onChange, onError) {
    return onSnapshot(getMessageQuery(circleId), (snapshot) => onChange(readPage(circleId, snapshot.docs)), onError);
  },

  async loadOlder(circleId, cursor) {
    const snapshot = await getDocs(getMessageQuery(circleId, cursor));
    return readPage(circleId, snapshot.docs);
  },

  async send({ author, body, circleId, messageId }) {
    const trimmedBody = body.trim();
    if (!trimmedBody || trimmedBody.length > MAX_CIRCLE_MESSAGE_LENGTH) throw new Error('This message cannot be sent.');
    const db = requireFirebase(database, 'Firestore');
    await setDoc(doc(db, 'circles', circleId, 'messages', messageId), {
      authorAvatarSeed: author.avatarSeed,
      authorAvatarStyle: author.avatarStyle,
      authorId: author.id,
      authorName: author.displayName,
      body: trimmedBody,
      circleId,
      clientMessageId: messageId,
      createdAt: serverTimestamp(),
      schemaVersion: 1,
    });
  },
};
