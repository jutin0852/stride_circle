import { ActivityIndicator, Animated, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { controlHeights, opacity, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { usePressMotion } from '@/hooks/use-press-motion';

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
  const feedback = usePressMotion(isDisabled);
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.brandAction, borderBottomWidth: 4, borderColor: colors.brandActionPressed, borderWidth: 2 },
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
      onPressIn={event => { feedback.pressIn(); props.onPressIn?.(event); }}
      onPressOut={event => { feedback.pressOut(); props.onPressOut?.(event); }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        { minHeight: controlHeights[size], paddingHorizontal: size === 'small' ? spacing.lg : spacing.xl },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.content, { transform: [{ scale: feedback.scale }] }]}>
      {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? colors.contentOnBrand : colors.contentPrimary} /> : <>
        <AppText tone={variant === 'primary' ? 'onBrand' : variant === 'danger' ? 'danger' : variant === 'secondary' ? 'inverse' : 'primary'} variant="button">{children}</AppText>
        {trailing}
      </>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  disabled: { opacity: opacity.disabled },
  content: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', flexShrink: 1 },
  pressed: { opacity: opacity.pressed },
});
