import { fireEvent, render } from '@testing-library/react-native';

import { CircleChatIconButton } from './circle-chat-icon-button';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('circle chat icon button', () => {
  it('shows a numeric unread badge and announces the count accessibly', async () => {
    const onPress = jest.fn();
    const screen = await render(<CircleChatIconButton onPress={onPress} unreadCount={7} />);
    const button = screen.getByRole('button', { name: 'Open circle chat, 7 unread messages' });

    expect(screen.getByText('7', { includeHiddenElements: true })).toBeTruthy();
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the entry icon-only when there are no unread messages', async () => {
    const screen = await render(<CircleChatIconButton onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Open circle chat' })).toBeTruthy();
    expect(screen.queryByText('Circle chat')).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('indicates unread messages beyond the loaded chat page', async () => {
    const screen = await render(<CircleChatIconButton moreMayBeUnread unreadCount={50} onPress={jest.fn()} />);
    expect(screen.getByText('50+', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open circle chat, 50 or more unread messages' })).toBeTruthy();
  });
});
