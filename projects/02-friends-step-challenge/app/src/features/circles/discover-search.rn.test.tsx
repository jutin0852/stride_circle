import { Animated } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { DiscoverSearch } from './discover-search';

let mockReducedMotion = false;
jest.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => mockReducedMotion }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
beforeEach(() => { mockReducedMotion = false; });
afterEach(() => { jest.restoreAllMocks(); });

it('opens and closes with short interruptible transitions', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const onChange = jest.fn();
  const screen = await render(<DiscoverSearch visible={false} value="" onChange={onChange} />);
  expect(screen.queryByPlaceholderText('Search by circle or area')).toBeNull();
  await screen.rerender(<DiscoverSearch visible value="" onChange={onChange} />);
  expect(screen.getByLabelText('Search public Circles').props.autoFocus).toBe(true);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 180 }));
  await screen.rerender(<DiscoverSearch visible={false} value="" onChange={onChange} />);
  expect(screen.queryByLabelText('Search public Circles')).toBeNull();
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, duration: 120 }));
  await screen.rerender(<DiscoverSearch visible value="" onChange={onChange} />);
  expect(screen.getByLabelText('Search public Circles').props.editable).toBe(true);
});

it('clears the query without closing the input', async () => {
  const onChange = jest.fn();
  const screen = await render(<DiscoverSearch visible value="Yaba" onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
  expect(onChange).toHaveBeenCalledWith('');
  expect(screen.getByLabelText('Search public Circles')).toBeTruthy();
});

it('uses instant transitions and no movement with Reduce Motion', async () => {
  mockReducedMotion = true;
  const timing = jest.spyOn(Animated, 'timing');
  const screen = await render(<DiscoverSearch visible value="" onChange={jest.fn()} />);
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 0 }));
  await screen.rerender(<DiscoverSearch visible={false} value="" onChange={jest.fn()} />);
  await waitFor(() => expect(screen.queryByTestId('discover-search-reveal', { includeHiddenElements: true })).toBeNull());
});
