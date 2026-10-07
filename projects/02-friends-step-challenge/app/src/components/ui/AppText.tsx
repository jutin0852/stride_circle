import { StyleSheet, Text, type TextProps } from 'react-native';

import { fontFamilyForWeight, typeScale } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type AppTextVariant = keyof typeof typeScale;
export type AppTextTone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'onBrand' | 'link' | 'success' | 'warning' | 'danger';

type AppTextProps = TextProps & {
  tone?: AppTextTone;
  variant?: AppTextVariant;
};

export function AppText({ style, tone = 'primary', variant = 'body', ...props }: AppTextProps) {
  const { colors } = useAppTheme();
  const overrides = StyleSheet.flatten(style) ?? {};
  const fontFamily = overrides.fontFamily ?? (overrides.fontWeight ? fontFamilyForWeight(overrides.fontWeight) : typeScale[variant].fontFamily);
  const toneColors: Record<AppTextTone, string> = {
    primary: colors.contentPrimary,
    secondary: colors.contentSecondary,
    tertiary: colors.contentTertiary,
    inverse: colors.contentInverse,
    onBrand: colors.contentOnBrand,
    link: colors.contentLink,
    success: colors.successContent,
    warning: colors.warningContent,
    danger: colors.dangerContent,
  };
  return <Text {...props} style={[styles.base, typeScale[variant], { color: toneColors[tone] }, style, { fontFamily, fontWeight: 'normal' }]} />;
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
