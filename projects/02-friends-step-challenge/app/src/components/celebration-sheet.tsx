import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useAppColors } from '@/design-system/use-app-theme';

type CelebrationSheetProps = {
  body: string;
  onDismiss: () => void;
  primaryLabel: string;
  title: string;
  visible: boolean;
};

export function CelebrationSheet({ body, onDismiss, primaryLabel, title, visible }: CelebrationSheetProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            <Ionicons color={colors.onAccent} name="sparkles" size={31} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Button onPress={onDismiss} style={{ marginTop: 28, width: '100%' }} trailing={<Ionicons color={colors.onAccent} name="arrow-forward" size={19} />}>{primaryLabel}</Button>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay, flex: 1, justifyContent: 'flex-end' },
  sheet: { alignItems: 'center', backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', paddingHorizontal: 24, paddingTop: 32 },
  sparkles: { height: 92, left: 0, position: 'absolute', right: 0, top: 12 },
  sparkle: { backgroundColor: colors.infoSurface, borderRadius: 999, position: 'absolute' },
  sparkleOne: { height: 10, left: '22%', top: 20, width: 10 },
  sparkleTwo: { backgroundColor: colors.brandActionPressed, height: 7, right: '23%', top: 46, width: 7 },
  sparkleThree: { backgroundColor: colors.brandActionSoft, height: 14, right: '33%', top: 8, width: 14 },
  iconWrap: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 37, height: 74, justifyContent: 'center', width: 74 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 20, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 9, maxWidth: 290, textAlign: 'center' },
}); }
