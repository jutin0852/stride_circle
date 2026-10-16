import { ActivityIndicator, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { controlHeights, opacity, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { PressableScale } from '@/components/ui/PressableScale';

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
    // Home's “View circle” action is the visual reference for primary actions.
    primary: { backgroundColor: colors.brandAction, borderBottomWidth: 5, borderColor: colors.brandActionPressed, borderWidth: 2, borderRadius: 12, padding: 10 },
    secondary: { backgroundColor: colors.brandDark },
    tertiary: { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 },
    danger: { backgroundColor: colors.dangerSurface, borderColor: colors.dangerContent, borderWidth: 1 },
  };

  return (
    <PressableScale
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? children}
      accessibilityRole="button"
      accessibilityState={{ ...props.accessibilityState, busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        { minHeight: variant === 'primary' ? 48 : controlHeights[size], paddingHorizontal: variant === 'primary' ? 10 : size === 'small' ? spacing.lg : spacing.xl },
        isDisabled && (variant === 'primary' ? styles.primaryDisabled : styles.disabled),
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
    >
      <View pointerEvents="none" style={styles.content}>
      {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'secondary' ? colors.contentOnBrand : colors.contentPrimary} /> : <>
        <AppText style={variant === 'primary' ? styles.primaryLabel : styles.label} tone={variant === 'primary' ? 'onBrand' : variant === 'danger' ? 'danger' : variant === 'secondary' ? 'inverse' : 'primary'} variant="button">{children}</AppText>
        {trailing}
      </>}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  disabled: { opacity: opacity.disabled },
  primaryDisabled: { opacity: 0.55 },
  primaryLabel: { fontSize: 16, lineHeight: 23, letterSpacing: 0, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  label: { textAlign: 'center', flexShrink: 1 },
  content: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', flexShrink: 1 },
});
