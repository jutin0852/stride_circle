import type { AvatarStyle } from '@/lib/avatar';

export const MAX_CIRCLE_MESSAGE_LENGTH = 500;

export type CircleChatAuthor = {
  id: string;
  displayName: string;
  avatarSeed: string;
  avatarStyle: AvatarStyle;
};

export type CircleMessageStatus = 'sent' | 'pending' | 'error';

export type CircleMessage = {
  id: string;
  circleId: string;
  author: CircleChatAuthor;
  body: string;
  createdAt: Date;
  status: CircleMessageStatus;
};

/** A provider-neutral cursor. Firebase adapters translate it into a Firestore cursor. */
export type CircleMessageCursor = {
  createdAt: string;
  id: string;
};

export function normalizeCircleMessageBody(value: string) {
  return value.replace(/\r\n?/g, '\n').trim();
}

export function validateCircleMessageBody(value: string) {
  const body = normalizeCircleMessageBody(value);
  if (!body) return 'Write a message first.';
  if (body.length > MAX_CIRCLE_MESSAGE_LENGTH) return `Keep messages under ${MAX_CIRCLE_MESSAGE_LENGTH} characters.`;
  return null;
}

export function createCircleMessageId() {
  return `message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
