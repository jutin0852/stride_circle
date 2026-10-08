import { forwardRef } from 'react';
import { Pressable, StyleSheet, type PressableProps, type View } from 'react-native';

import { radii, spacing, touchTargets } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

type IconButtonProps = Omit<PressableProps, 'children'> & {
  children: React.ReactNode;
  filled?: boolean;
  size?: number;
};

export const IconButton = forwardRef<View, IconButtonProps>(function IconButton({ children, filled = false, size = touchTargets.minimum, style, ...props }, ref) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      ref={ref}
      style={({ pressed }) => [styles.base, { height: size, width: size, borderColor: colors.border, backgroundColor: filled ? colors.card : 'transparent' }, pressed && styles.pressed, typeof style === 'function' ? style({ pressed }) : style]}
    >
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', padding: spacing.xs },
  pressed: { opacity: 0.72 },
});
