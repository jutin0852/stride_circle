import { render, userEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CircleChatView, type CircleChatViewProps } from './circle-chat-view';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));

const members = [
  { avatarSeed: 'ada', avatarStyle: 'sprouts' as const, displayName: 'Ada Walker', role: 'member' as const, userId: 'ada-id' },
  { avatarSeed: 'you', avatarStyle: 'clay' as const, displayName: 'Jordan Walker', role: 'owner' as const, userId: 'you-id' },
];

const messages = [
  { author: { avatarSeed: 'ada', avatarStyle: 'sprouts' as const, displayName: 'Ada Walker', id: 'ada-id' }, body: 'Ready for today?', circleId: 'circle-1', createdAt: new Date('2026-10-08T08:00:00Z'), id: 'message-1', status: 'sent' as const },
  { author: { avatarSeed: 'you', avatarStyle: 'clay' as const, displayName: 'Jordan Walker', id: 'you-id' }, body: 'Absolutely!', circleId: 'circle-1', createdAt: new Date('2026-10-08T08:01:00Z'), id: 'message-2', status: 'sent' as const },
];

async function setup(overrides: Partial<CircleChatViewProps> = {}) {
  const onSend = jest.fn().mockResolvedValue(true);
  const props: CircleChatViewProps = {
    circleName: 'Morning Walkers',
    currentUserId: 'you-id',
    error: null,
    hasMore: false,
    loadingOlder: false,
    memberCount: 2,
    members,
    messages,
    onBack: jest.fn(),
    onLoadOlder: jest.fn(),
    onRetry: jest.fn(),
    onRetryMessage: jest.fn(),
    onSend,
    status: 'ready',
    ...overrides,
  };
  const screen = await render(<SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}><CircleChatView {...props} /></SafeAreaProvider>);
  return { onSend, props, screen };
}

describe('circle chat view', () => {
  it('shows the circle context, members, and messages', async () => {
    const { screen } = await setup();
    expect(screen.getByRole('header', { name: 'Morning Walkers' })).toBeTruthy();
    expect(screen.getByText('2 walkers')).toBeTruthy();
    expect(screen.getByText('Ready for today?')).toBeTruthy();
    expect(screen.getByText('Absolutely!')).toBeTruthy();
    expect(screen.getByText(/TODAY|2026/)).toBeTruthy();
    expect(screen.queryByText('Your circle chat')).toBeNull();
    expect(screen.queryByLabelText('2 circle members')).toBeNull();
  });

  it('sends a drafted message and clears the composer after success', async () => {
    const { onSend, screen } = await setup();
    const user = userEvent.setup();
    const input = screen.getByLabelText('Message the circle');
    await user.type(input, 'See you at the park.');
    await user.press(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(onSend).toHaveBeenCalledWith('See you at the park.'));
    expect(screen.getByLabelText('Message the circle').props.value).toBe('');
  });

  it('explains an empty room and offers recovery for a read error', async () => {
    const empty = await setup({ messages: [] });
    expect(empty.screen.getByText('Start the conversation')).toBeTruthy();

    const failed = await setup({ error: 'Try again later.', status: 'error' });
    expect(failed.screen.getByText('Circle chat unavailable')).toBeTruthy();
    expect(failed.screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
