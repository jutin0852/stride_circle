import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { controlHeights, opacity, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

type ButtonProps = Omit<PressableProps, 'children'> & {
  children: string;
  loading?: boolean;
  size?: ButtonSize;
  trailing?: React.ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, disabled, loading = false, onPress, size = 'large', style, trailing, variant = 'primary', ...props }: ButtonProps) {
  const { colors } = useAppTheme();
  const isDisabled = Boolean(disabled || loading);
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.brandAction },
    secondary: { backgroundColor: colors.brandDark },
    tertiary: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
    danger: { backgroundColor: colors.dangerSurface, borderColor: colors.dangerContent, borderWidth: 1 },
  };

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
      {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? colors.contentOnBrand : colors.contentPrimary} /> : <>
        <AppText tone={variant === 'primary' ? 'onBrand' : variant === 'danger' ? 'danger' : variant === 'secondary' ? 'inverse' : 'primary'} variant="button">{children}</AppText>
        {trailing}
      </>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  disabled: { opacity: opacity.disabled },
  pressed: { opacity: opacity.pressed, transform: [{ scale: 0.985 }] },
});
