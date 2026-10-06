import { fireEvent, render } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';

describe('<Button />', () => {
  it('exposes a clear accessible action and responds to presses', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button onPress={onPress}>Walk for your circle</Button>);

    fireEvent.press(getByRole('button', { name: 'Walk for your circle' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables interaction while loading', async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button loading onPress={onPress}>Sync steps</Button>);
    const button = getByRole('button', { name: 'Sync steps' });

    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ busy: true, disabled: true }));
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
