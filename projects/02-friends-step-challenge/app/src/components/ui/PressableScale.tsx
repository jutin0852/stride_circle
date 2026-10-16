import { forwardRef, useState, type ElementRef } from 'react';
import { Animated, Pressable, type PressableProps, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';

import { usePressMotion } from '@/hooks/use-press-motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps;

/**
 * The app's one press treatment for buttons and tappable cards: the whole control springs to
 * 0.96 while held (usePressMotion), never while disabled or with Reduce Motion on. Drop-in for
 * Pressable: `style` and `children` may still be functions of `{ pressed }`. Keep pressed colour
 * changes in `style`; do not add opacity or translate on top of the scale.
 */
export const PressableScale = forwardRef<ElementRef<typeof Pressable>, PressableScaleProps>(function PressableScale(
  { children, disabled, onPressIn, onPressOut, style, ...props },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  const feedback = usePressMotion(Boolean(disabled));
  const state: PressableStateCallbackType = { pressed };
  const resolvedStyle = (typeof style === 'function' ? style(state) : style) as StyleProp<ViewStyle>;

  return (
    <AnimatedPressable
      {...props}
      ref={ref}
      disabled={disabled}
      onPressIn={(event) => { setPressed(true); feedback.pressIn(); onPressIn?.(event); }}
      onPressOut={(event) => { setPressed(false); feedback.pressOut(); onPressOut?.(event); }}
      style={[resolvedStyle, { transform: [{ scale: feedback.scale }] }]}
    >
      {typeof children === 'function' ? children(state) : children}
    </AnimatedPressable>
  );
});
