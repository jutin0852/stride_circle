import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

type CelebrationSheetProps = {
  body: string;
  onDismiss: () => void;
  primaryLabel: string;
  title: string;
  visible: boolean;
};

export function CelebrationSheet({ body, onDismiss, primaryLabel, title, visible }: CelebrationSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} statusBarTranslucent transparent visible={visible}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View pointerEvents="none" style={styles.sparkles}>
            <View style={[styles.sparkle, styles.sparkleOne]} />
            <View style={[styles.sparkle, styles.sparkleTwo]} />
            <View style={[styles.sparkle, styles.sparkleThree]} />
          </View>
          <View style={styles.iconWrap}>
            <Ionicons color="#FFFFFF" name="sparkles" size={31} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable accessibilityRole="button" onPress={onDismiss} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Text style={styles.actionText}>{primaryLabel}</Text>
            <Ionicons color="#FFFFFF" name="arrow-forward" size={19} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(17, 24, 39, 0.38)', flex: 1, justifyContent: 'flex-end' },
  sheet: { alignItems: 'center', backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingHorizontal: 24, paddingTop: 32 },
  sparkles: { height: 92, left: 0, position: 'absolute', right: 0, top: 12 },
  sparkle: { backgroundColor: '#BFDBFE', borderRadius: 999, position: 'absolute' },
  sparkleOne: { height: 10, left: '22%', top: 20, width: 10 },
  sparkleTwo: { backgroundColor: '#93C5FD', height: 7, right: '23%', top: 46, width: 7 },
  sparkleThree: { backgroundColor: '#DBEAFE', height: 14, right: '33%', top: 8, width: 14 },
  iconWrap: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 37, height: 74, justifyContent: 'center', width: 74 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 20, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 9, maxWidth: 290, textAlign: 'center' },
  action: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 28, minHeight: 56, width: '100%' },
  actionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  pressed: { backgroundColor: colors.accentPressed, transform: [{ scale: 0.98 }] },
});
