import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyForWeight, semanticColors, typeScale } from '@/design-system/tokens';

export type AppTextVariant = keyof typeof typeScale;
export type AppTextTone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'onBrand' | 'link' | 'success' | 'warning' | 'danger';

type AppTextProps = TextProps & {
  tone?: AppTextTone;
  variant?: AppTextVariant;
};

const toneStyles: Record<AppTextTone, TextStyle> = {
  primary: { color: semanticColors.contentPrimary },
  secondary: { color: semanticColors.contentSecondary },
  tertiary: { color: semanticColors.contentTertiary },
  inverse: { color: semanticColors.contentInverse },
  onBrand: { color: semanticColors.contentOnBrand },
  link: { color: semanticColors.contentLink },
  success: { color: semanticColors.successContent },
  warning: { color: semanticColors.warningContent },
  danger: { color: semanticColors.dangerContent },
};

export function AppText({ style, tone = 'primary', variant = 'body', ...props }: AppTextProps) {
  const overrides = StyleSheet.flatten(style) ?? {};
  const fontFamily = overrides.fontFamily ?? (overrides.fontWeight ? fontFamilyForWeight(overrides.fontWeight) : typeScale[variant].fontFamily);
  return <Text {...props} style={[styles.base, typeScale[variant], toneStyles[tone], style, { fontFamily, fontWeight: 'normal' }]} />;
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
