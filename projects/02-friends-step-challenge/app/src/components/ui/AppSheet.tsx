import { AccessibilityInfo, Animated, BackHandler, Easing, findNodeHandle, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { elevation, motion, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export type AppSheetFocusRef = React.RefObject<View | null>;

type AppSheetProps = {
  accessibilityLabel?: string;
  backdropContent?: React.ReactNode;
  closeAccessibilityLabel?: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  grabber?: boolean;
  dismissible?: boolean;
  swipeToDismiss?: boolean;
  initialFocusRef?: AppSheetFocusRef;
  keyboardAware?: boolean;
  onClose: () => void;
  returnFocusRef?: AppSheetFocusRef;
  sheetStyle?: StyleProp<ViewStyle>;
  testID?: string;
  visible: boolean;
};

export function AppSheet({
  accessibilityLabel = 'Bottom sheet',
  backdropContent,
  closeAccessibilityLabel = 'Close sheet',
  children,
  contentStyle,
  grabber = true,
  dismissible = true,
  swipeToDismiss = false,
  initialFocusRef,
  keyboardAware = false,
  onClose,
  returnFocusRef,
  sheetStyle,
  testID,
  visible,
}: AppSheetProps) {
  const { colors } = useAppTheme();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));
  const [sheetHeight, setSheetHeight] = useState(400);
  const sheetRef = useRef<View>(null);
  const reducedMotion = useReducedMotion();
  // Keep the modal mounted for its exit animation on every open/close cycle.
  if (visible && !mounted) setMounted(true);
  const requestClose = () => { if (dismissible && visible) onClose(); };
  const panResponder = useMemo(() => {
    const resetDrag = () => {
      if (reducedMotion) { dragY.setValue(0); return; }
      Animated.spring(dragY, { toValue: 0, damping: 28, stiffness: 260, mass: 1, overshootClamping: true, useNativeDriver: Platform.OS !== 'web' }).start();
    };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => swipeToDismiss && dismissible && visible && gesture.numberActiveTouches === 1 && gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
      onPanResponderGrant: () => { dragY.stopAnimation(); },
      onPanResponderMove: (_event, gesture) => { dragY.setValue(Math.max(0, gesture.dy)); },
      onPanResponderRelease: (_event, gesture) => {
        if (dismissible && visible && (gesture.dy > Math.min(120, sheetHeight * 0.25) || (gesture.dy > 24 && gesture.vy > 0.8))) onClose();
        else resetDrag();
      },
      onPanResponderTerminate: resetDrag,
    });
  }, [dismissible, dragY, onClose, reducedMotion, sheetHeight, swipeToDismiss, visible]);

  useEffect(() => {
    if (visible) {
      progress.stopAnimation();
      if (reducedMotion) {
        progress.setValue(1);
        dragY.setValue(0);
        focusInitial(initialFocusRef, sheetRef);
      } else {
        Animated.spring(dragY, { toValue: 0, damping: 28, stiffness: 260, mass: 1, overshootClamping: true, useNativeDriver: Platform.OS !== 'web' }).start();
        Animated.timing(progress, { toValue: 1, duration: motion.standard, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
          if (finished) focusInitial(initialFocusRef, sheetRef);
        });
      }
      return () => progress.stopAnimation();
    }

    if (!mounted) return;
    progress.stopAnimation();
    if (reducedMotion) {
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
        if (!finished) return;
        setMounted(false);
        restoreFocus(returnFocusRef);
      });
      return () => progress.stopAnimation();
    }

    Animated.timing(progress, { toValue: 0, duration: motion.fast, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      restoreFocus(returnFocusRef);
    });
    return () => progress.stopAnimation();
  }, [dragY, initialFocusRef, mounted, progress, reducedMotion, returnFocusRef, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (dismissible) onClose();
      return true;
    });
    return () => subscription.remove();
  }, [dismissible, mounted, onClose, visible]);

  if (!mounted && !visible) return null;

  const sheet = (
    <Animated.View
      ref={sheetRef}
      accessible={initialFocusRef == null}
      accessibilityLabel={accessibilityLabel}
      accessibilityViewIsModal
      testID={testID}
      onLayout={(event) => { setSheetHeight(event.nativeEvent.layout.height); }}
      style={[styles.sheet, { backgroundColor: colors.sheetSurface, borderColor: colors.sheetDivider, paddingBottom: Math.max(insets.bottom, spacing.lg) }, sheetStyle, { opacity: progress, transform: [{ translateY: Animated.add(dragY, progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] })) }] }]}
    >
      {grabber ? <View testID={swipeToDismiss ? 'sheet-drag-handle' : undefined} {...(swipeToDismiss ? panResponder.panHandlers : {})} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={swipeToDismiss ? styles.dragHandle : undefined}><View style={[styles.grabber, { backgroundColor: colors.sheetGrabber }]} /></View> : null}
      <KeyboardAvoidingView behavior={keyboardAware ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined} style={styles.keyboardContainer}>
        <View style={contentStyle}>{children}</View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <Modal animationType="none" onRequestClose={requestClose} statusBarTranslucent transparent visible>
      <View style={styles.backdrop}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: Animated.multiply(progress, dragY.interpolate({ inputRange: [0, 300], outputRange: [1, 0], extrapolate: 'clamp' })) }]}>
          {backdropContent}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        </Animated.View>
        <Pressable accessibilityLabel={closeAccessibilityLabel} accessibilityRole="button" accessibilityState={{ disabled: !dismissible }} disabled={!dismissible} onPress={requestClose} style={StyleSheet.absoluteFill} />
        {sheet}
      </View>
    </Modal>
  );
}

function focusInitial(initialFocusRef: AppSheetFocusRef | undefined, sheetRef: React.RefObject<View | null>) {
  const target = initialFocusRef?.current ?? sheetRef.current;
  const tag = findNodeHandle(target);
  if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
  if (initialFocusRef?.current && 'focus' in initialFocusRef.current) initialFocusRef.current.focus();
}

function restoreFocus(returnFocusRef: AppSheetFocusRef | undefined) {
  returnFocusRef?.current?.focus?.();
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, borderTopWidth: 1, maxHeight: '91%', overflow: 'hidden', paddingHorizontal: spacing.xl, paddingTop: spacing.sm, ...elevation.floating },
  grabber: { alignSelf: 'center', borderRadius: radii.pill, height: 4, marginBottom: spacing.sm, width: 42 },
  dragHandle: { alignItems: 'center', justifyContent: 'center', height: 48, marginTop: -spacing.sm },
  keyboardContainer: { flexShrink: 1 },
});
