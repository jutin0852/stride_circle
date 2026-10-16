import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useAppColors } from '@/design-system/use-app-theme';
import { useConnectivity } from '@/hooks/use-connectivity';

/**
 * Floats above the tab bar instead of taking layout space, so screens do not
 * move when the connection drops or returns.
 */
export function OfflineBanner({ bottom }: { bottom: number }) {
  const { offline } = useConnectivity();
  const colors = useAppColors();
  if (!offline) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom }]}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.ink }]}>
        <Ionicons color={colors.background} name="cloud-offline-outline" size={18} />
        <AppText style={[styles.text, { color: colors.background }]} variant="caption">
          You’re offline. Some info may be out of date; walks and steps sync when you reconnect.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  text: { flexShrink: 1 },
  wrap: { left: 16, position: 'absolute', right: 16 },
});
