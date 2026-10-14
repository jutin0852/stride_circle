import { Alert, Animated } from 'react-native';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CircleChatView, type CircleChatViewProps } from './circle-chat-view';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/components/dicebear-avatar', () => ({ DicebearAvatar: () => null }));
let mockReducedMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReducedMotion }));

const members = [
  { avatarSeed: 'ada', avatarStyle: 'sprouts' as const, displayName: 'Ada Walker', role: 'member' as const, userId: 'ada-id' },
  { avatarSeed: 'you', avatarStyle: 'clay' as const, displayName: 'Jordan Walker', role: 'owner' as const, userId: 'you-id' },
];

function createMessages() {
  const now = new Date();
  const todayAtNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);

  return [
    { author: { avatarSeed: 'ada', avatarStyle: 'sprouts' as const, displayName: 'Ada Walker', id: 'ada-id' }, body: 'Ready for today?', circleId: 'circle-1', createdAt: todayAtNoon, id: 'message-1', status: 'sent' as const },
    { author: { avatarSeed: 'you', avatarStyle: 'clay' as const, displayName: 'Jordan Walker', id: 'you-id' }, body: 'Absolutely!', circleId: 'circle-1', createdAt: new Date(todayAtNoon.getTime() + 60_000), id: 'message-2', status: 'sent' as const },
  ];
}

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
    messages: createMessages(),
    onBack: jest.fn(),
    onLoadOlder: jest.fn(),
    onRetry: jest.fn(),
    onRetryMessage: jest.fn(),
    onSend,
    onReportMessage: jest.fn(),
    onReportMember: jest.fn(),
    onBlockMember: jest.fn(),
    status: 'ready',
    ...overrides,
  };
  const screen = await render(<SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}><CircleChatView {...props} /></SafeAreaProvider>);
  return { onSend, props, screen };
}

describe('circle chat view', () => {
  afterEach(() => { mockReducedMotion = false; jest.restoreAllMocks(); });

  it('animates a new arrival once but keeps initial and paginated history still', async () => {
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
    const { props, screen } = await setup();
    expect(timing).not.toHaveBeenCalled();
    const older = { ...props.messages[0], id: 'older-message', createdAt: new Date(props.messages[0].createdAt.getTime() - 60_000) };
    const wrap = (messages: CircleChatViewProps['messages']) => <SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}><CircleChatView {...props} messages={messages} /></SafeAreaProvider>;
    await screen.rerender(wrap([older, ...props.messages]));
    expect(timing).not.toHaveBeenCalled();
    const incoming = { ...props.messages[0], id: 'new-message', body: 'Let’s walk!', createdAt: new Date(props.messages[0].createdAt.getTime() + 120_000), status: 'pending' as const };
    await screen.rerender(wrap([older, ...props.messages, incoming]));
    expect(timing).toHaveBeenCalledTimes(1);
    await screen.rerender(wrap([older, ...props.messages, { ...incoming, status: 'sent' }]));
    expect(timing).toHaveBeenCalledTimes(1);
  });

  it('shows new messages without an entrance animation when Reduce Motion is enabled', async () => {
    mockReducedMotion = true;
    const timing = jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
    const { props, screen } = await setup();
    const incoming = { ...props.messages[0], id: 'new-message', body: 'See you soon.', createdAt: new Date(props.messages[0].createdAt.getTime() + 120_000) };
    await screen.rerender(<SafeAreaProvider initialMetrics={{ frame: { height: 844, width: 390, x: 0, y: 0 }, insets: { bottom: 0, left: 0, right: 0, top: 0 } }}><CircleChatView {...props} messages={[...props.messages, incoming]} /></SafeAreaProvider>);
    expect(screen.getByText('See you soon.')).toBeTruthy();
    expect(timing).not.toHaveBeenCalled();
  });

  it('shows the circle context, members, and messages', async () => {
    const { screen } = await setup();
    expect(screen.getByRole('header', { name: 'Morning Walkers' })).toBeTruthy();
    expect(screen.getByText('2 walkers')).toBeTruthy();
    expect(screen.getByText('Ready for today?')).toBeTruthy();
    expect(screen.getByText('Absolutely!')).toBeTruthy();
    expect(screen.getByText('TODAY')).toBeTruthy();
    expect(screen.queryByText('Your circle chat')).toBeNull();
    expect(screen.queryByLabelText('2 circle members')).toBeNull();
  });

  it('keeps long circle names readable in both the chat and loading headers', async () => {
    const circleName = 'Saturday Neighborhood Riverside Walkers';
    const ready = await setup({ circleName });
    expect(ready.screen.getByRole('header', { name: circleName }).props.numberOfLines).toBeUndefined();

    const loading = await setup({ circleName, status: 'loading' });
    expect(loading.screen.getByRole('header', { name: circleName }).props.numberOfLines).toBeUndefined();
    expect(loading.screen.getByRole('button', { name: 'Go back to circle' })).toBeTruthy();
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

  it('offers report and block actions for another walker’s message', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Report message')?.onPress?.();
    });
    const { props, screen } = await setup();

    await userEvent.setup().press(screen.getByRole('button', { name: "Safety options for Ada Walker's message" }));

    expect(alert).toHaveBeenCalled();
    expect(props.onReportMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'message-1' }));
    alert.mockRestore();
  });

  it('explains an empty room and offers recovery for a read error', async () => {
    const empty = await setup({ messages: [] });
    expect(empty.screen.getByText('Start the conversation')).toBeTruthy();

    const failed = await setup({ error: 'Try again later.', status: 'error' });
    expect(failed.screen.getByText('Circle chat unavailable')).toBeTruthy();
    expect(failed.screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});
