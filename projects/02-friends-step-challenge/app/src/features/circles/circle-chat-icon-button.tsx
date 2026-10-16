import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, opacity } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { usePressMotion } from '@/hooks/use-press-motion';


export function CircleChatIconButton({ onPress, unreadCount = 0, moreMayBeUnread = false, style }: {
  onPress: () => void;
  unreadCount?: number;
  moreMayBeUnread?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useAppColors();
  const feedback = usePressMotion();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const showBadge = unreadCount > 0 || moreMayBeUnread;
  const badgeLabel = moreMayBeUnread && unreadCount >= 50 ? '50+' : unreadCount > 99 ? '99+' : String(unreadCount);
  const accessibleCount = moreMayBeUnread && unreadCount >= 50 ? '50 or more unread messages' : `${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`;

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={showBadge ? `Open circle chat, ${accessibleCount}` : 'Open circle chat'}
    onPress={onPress}
    onPressIn={feedback.pressIn}
    onPressOut={feedback.pressOut}
    style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
  >
    <Animated.View pointerEvents="none" style={{ transform: [{ scale: feedback.scale }] }}><Ionicons color={colors.accentPressed} name="chatbubbles-outline" size={21} /></Animated.View>
    {showBadge ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.badge}><Text style={styles.badgeText}>{badgeLabel}</Text></View> : null}
  </Pressable>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    button: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    pressed: { opacity: opacity.pressed },
    badge: { alignItems: 'center', backgroundColor: colors.dangerContent, borderColor: colors.background, borderRadius: 10, borderWidth: 1.5, height: 19, justifyContent: 'center', minWidth: 19, paddingHorizontal: 4, position: 'absolute', right: -7, top: -7 },
    badgeText: { color: colors.background, fontSize: 10, fontVariant: ['tabular-nums'], fontWeight: '800', lineHeight: 13 },
  });
}
