import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { controlHeights, opacity, radii, semanticColors, spacing } from '@/design-system/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

type ButtonProps = Omit<PressableProps, 'children'> & {
  children: string;
  loading?: boolean;
  size?: ButtonSize;
  trailing?: React.ReactNode;
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: semanticColors.brandAction, borderBottomWidth: 4, borderColor: semanticColors.brandActionPressed, borderWidth: 2 },
  secondary: { backgroundColor: semanticColors.brandDark },
  tertiary: { backgroundColor: 'transparent', borderColor: semanticColors.border, borderWidth: 1 },
  danger: { backgroundColor: semanticColors.dangerSurface, borderColor: semanticColors.dangerContent, borderWidth: 1 },
};

export function Button({ children, disabled, loading = false, onPress, size = 'large', style, trailing, variant = 'primary', ...props }: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? children}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        { minHeight: controlHeights[size], paddingHorizontal: size === 'small' ? spacing.lg : spacing.xl },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? semanticColors.contentOnBrand : semanticColors.contentPrimary} /> : <>
        <AppText tone={variant === 'primary' ? 'onBrand' : variant === 'danger' ? 'danger' : variant === 'secondary' ? 'inverse' : 'primary'} variant="button">{children}</AppText>
        {trailing}
      </>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  disabled: { opacity: opacity.disabled },
  pressed: { borderBottomWidth: 2, opacity: opacity.pressed, transform: [{ translateY: 2 }] },
});
