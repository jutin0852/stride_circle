import type { CircleMessage } from '@/domain/circle-chat';
import type { CircleMessagePage } from '@/data/firebase/circle-chat-repository';

export type ReadStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function circleChatReadKey(userId: string, circleId: string) {
  return `stride-circle:chat-read:${encodeURIComponent(userId)}:${encodeURIComponent(circleId)}`;
}

export async function getCircleChatReadAt(storage: ReadStorage, userId: string, circleId: string) {
  const value = await storage.getItem(circleChatReadKey(userId, circleId));
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function markCircleChatReadAt(storage: ReadStorage, userId: string, circleId: string, date: Date) {
  if (Number.isNaN(date.getTime())) return;
  const previous = await getCircleChatReadAt(storage, userId, circleId);
  const next = previous && new Date(previous).getTime() > date.getTime() ? previous : date.toISOString();
  await storage.setItem(circleChatReadKey(userId, circleId), next);
}

export function countUnreadCircleMessages(messages: CircleMessage[], readAt: string, page: CircleMessagePage) {
  const readTime = new Date(readAt).getTime();
  const count = messages.filter((message) => message.createdAt.getTime() > readTime).length;
  const oldestTime = page.oldestCursor ? new Date(page.oldestCursor.createdAt).getTime() : Number.NaN;
  return {
    count,
    moreMayBeUnread: page.hasMore && Number.isFinite(oldestTime) && oldestTime > readTime,
  };
}
