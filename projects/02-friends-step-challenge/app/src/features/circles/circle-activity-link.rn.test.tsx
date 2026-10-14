import { fireEvent, render } from '@testing-library/react-native';

import { CircleActivityLink } from './circle-activity-link';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('circle Activity standings link', () => {
  it('presents an accessible inline action and opens the Activity destination', async () => {
    const onPress = jest.fn();
    const screen = await render(<CircleActivityLink onPress={onPress} />);
    const link = screen.getByRole('link', { name: 'Activity' });

    expect(screen.getByText('Activity')).toBeTruthy();
    fireEvent.press(link);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
