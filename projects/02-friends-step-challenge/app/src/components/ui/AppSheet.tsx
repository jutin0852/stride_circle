import { AccessibilityInfo, Animated, BackHandler, Easing, findNodeHandle, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useContext, useEffect, useRef, useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { elevation, motion, radii, spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type AppSheetFocusRef = React.RefObject<View | null>;

type AppSheetProps = {
  accessibilityLabel?: string;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  grabber?: boolean;
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
  children,
  contentStyle,
  grabber = true,
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
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const sheetRef = useRef<View>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (visible) {
      progress.stopAnimation();
      progress.setValue(reducedMotion ? 1 : 0);
      if (reducedMotion) {
        focusInitial(initialFocusRef, sheetRef);
      } else {
        Animated.timing(progress, { toValue: 1, duration: motion.standard, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
          if (finished) focusInitial(initialFocusRef, sheetRef);
        });
      }
      return;
    }

    if (!mounted) return;
    progress.stopAnimation();
    if (reducedMotion) {
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }).start(({ finished }) => {
        if (!finished) return;
        setMounted(false);
        restoreFocus(returnFocusRef);
      });
      return;
    }

    Animated.timing(progress, { toValue: 0, duration: motion.fast, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      restoreFocus(returnFocusRef);
    });
  }, [initialFocusRef, mounted, progress, reducedMotion, returnFocusRef, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [mounted, onClose, visible]);

  if (!mounted && !visible) return null;

  const sheet = (
    <Animated.View
      ref={sheetRef}
      accessible={initialFocusRef == null}
      accessibilityLabel={accessibilityLabel}
      accessibilityViewIsModal
      testID={testID}
      style={[styles.sheet, { backgroundColor: colors.sheetSurface, borderColor: colors.sheetDivider, paddingBottom: Math.max(insets.bottom, spacing.lg), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }] }, sheetStyle]}
    >
      {grabber ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.grabber, { backgroundColor: colors.sheetGrabber }]} /> : null}
      <KeyboardAvoidingView behavior={keyboardAware ? (Platform.OS === 'ios' ? 'padding' : 'height') : undefined} style={styles.keyboardContainer}>
        <View style={contentStyle}>{children}</View>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable accessibilityLabel="Close sheet" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} />
        {sheet}
      </View>
    </Modal>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);

  return reduced;
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
  keyboardContainer: { flexShrink: 1 },
});
