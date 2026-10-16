import { fireEvent, render } from '@testing-library/react-native';
import { DicebearAvatar } from './dicebear-avatar';

jest.mock('react-native-svg', () => {
  const { Text } = jest.requireActual('react-native');
  return { SvgUri: () => <Text>Generated character</Text> };
});
const choice = { seed: 'walker', style: 'sprouts' as const };
it('renders uploaded photos as circular images while preserving character avatars', async () => {
  const screen = await render(<DicebearAvatar choice={choice} fallback="AW" size={44} />);
  expect(screen.getByText('Generated character')).toBeTruthy();
  await screen.rerender(<DicebearAvatar choice={{ ...choice, photoURL: 'https://example.com/avatar.jpg' }} fallback="AW" size={44} />);
  expect(screen.getByLabelText('AW profile picture').props.source.uri).toBe('https://example.com/avatar.jpg');
  expect(screen.queryByText('Generated character')).toBeNull();
});
it('recovers from an image failure when a different picture is saved', async () => {
  const screen = await render(<DicebearAvatar choice={{ ...choice, photoURL: 'https://example.com/old.jpg' }} fallback="AW" />);
  await fireEvent(screen.getByLabelText('AW profile picture'), 'error');
  expect(screen.getByText('AW')).toBeTruthy();
  await screen.rerender(<DicebearAvatar choice={{ ...choice, photoURL: 'https://example.com/new.jpg' }} fallback="AW" />);
  expect(screen.getByLabelText('AW profile picture').props.source.uri).toBe('https://example.com/new.jpg');
});
