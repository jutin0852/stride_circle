import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { radii, semanticColors, spacing, touchTargets } from '@/design-system/tokens';

type IconButtonProps = Omit<PressableProps, 'children'> & {
  children: React.ReactNode;
  filled?: boolean;
  size?: number;
};

export function IconButton({ children, filled = false, size = touchTargets.minimum, style, ...props }: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [styles.base, { height: size, width: size }, filled && styles.filled, pressed && styles.pressed, typeof style === 'function' ? style({ pressed }) : style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderColor: semanticColors.border, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', padding: spacing.xs },
  filled: { backgroundColor: semanticColors.card },
  pressed: { opacity: 0.72 },
});
