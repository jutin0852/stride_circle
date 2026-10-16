import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { darkSemanticColors, fontFamilies, semanticColors } from '@/design-system/tokens';

let mockDark = false;
jest.mock('@/design-system/use-app-theme', () => {
  const tokens = jest.requireActual('@/design-system/tokens');
  return { useAppTheme: () => ({ isDark: mockDark, colors: mockDark ? tokens.darkSemanticColors : tokens.semanticColors }) };
});

describe('<Button />', () => {
  beforeEach(() => { mockDark = false; });
  it.each([false, true])('matches the Home primary action in dark mode=%s', async (dark) => {
    mockDark = dark;
    const colors = dark ? darkSemanticColors : semanticColors;
    const screen = await render(<Button>View circle</Button>);
    expect(StyleSheet.flatten(screen.getByRole('button', { name: 'View circle' }).props.style)).toEqual(expect.objectContaining({
      backgroundColor: colors.brandAction, borderColor: colors.brandActionPressed,
      borderRadius: 12, borderWidth: 2, borderBottomWidth: 5, minHeight: 48, padding: 10,
    }));
    expect(StyleSheet.flatten(screen.getByText('View circle').props.style)).toEqual(expect.objectContaining({
      color: colors.contentOnBrand, fontFamily: fontFamilies.extraBold, fontSize: 16, lineHeight: 23,
    }));
  });
  it('keeps secondary and destructive actions distinct and preserves selected state', async () => {
    const screen = await render(<Button accessibilityState={{ selected: true }} variant="danger">Delete saved walk</Button>);
    const button = screen.getByRole('button', { name: 'Delete saved walk' });
    expect(button.props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(semanticColors.dangerSurface);
  });
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
