import { describe, expect, it, vi } from 'vitest';

import {
  circleChatReadKey,
  countUnreadCircleMessages,
  getCircleChatReadAt,
  markCircleChatReadAt,
} from './circle-chat-read-state';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  };
}

describe('circle chat read state', () => {
  it('scopes the read cursor to both the user and circle', () => {
    expect(circleChatReadKey('user/one', 'circle one')).toBe('stride-circle:chat-read:user%2Fone:circle%20one');
  });

  it('ignores malformed saved cursors and never moves a cursor backwards', async () => {
    const key = circleChatReadKey('user-1', 'circle-1');
    const storage = memoryStorage({ [key]: 'not-a-date' });
    expect(await getCircleChatReadAt(storage, 'user-1', 'circle-1')).toBeNull();

    await markCircleChatReadAt(storage, 'user-1', 'circle-1', new Date('2026-10-09T12:00:00.000Z'));
    await markCircleChatReadAt(storage, 'user-1', 'circle-1', new Date('2026-10-09T11:00:00.000Z'));
    expect(await getCircleChatReadAt(storage, 'user-1', 'circle-1')).toBe('2026-10-09T12:00:00.000Z');
  });

  it('counts messages newer than the read cursor and flags an incomplete page', () => {
    const readAt = '2026-10-09T12:00:00.000Z';
    const messages = [
      { author: { id: 'other' }, createdAt: new Date('2026-10-09T11:59:00.000Z') },
      { author: { id: 'other' }, createdAt: new Date('2026-10-09T12:01:00.000Z') },
      { author: { id: 'me' }, createdAt: new Date('2026-10-09T12:02:00.000Z') },
      { author: { id: 'other' }, createdAt: new Date('2026-10-09T12:03:00.000Z') },
    ] as Parameters<typeof countUnreadCircleMessages>[0];
    const page = { hasMore: true, oldestCursor: { createdAt: '2026-10-09T12:00:01.000Z', id: 'message-1' }, messages: [] };
    expect(countUnreadCircleMessages(messages, readAt, page)).toEqual({ count: 3, moreMayBeUnread: true });
  });
});
