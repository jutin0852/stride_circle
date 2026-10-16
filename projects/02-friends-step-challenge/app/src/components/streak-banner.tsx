import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText, type AppSheetFocusRef } from '@/components/ui';
import { spacing, opacity } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';


export function StreakBanner({
  streakDays,
  accessibilityLabel,
  triggerRef,
  onPress,
  compact = false,
}: {
  streakDays: number | null;
  accessibilityLabel: string;
  triggerRef?: AppSheetFocusRef;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} ref={triggerRef} style={({ pressed }) => [styles.banner, compact && styles.compactBanner, pressed && styles.pressed]}>
    {!compact ? <View style={styles.copy}><AppText variant="bodySmall" style={styles.copyStrong}>{streakDays === null ? 'Your streak builds here.' : streakDays === 0 ? 'Fresh start. One walk begins a streak.' : 'Look at you, showing up.'}</AppText></View> : null}
    <View style={[styles.streakDays, compact && styles.compactStreakDays]}>
      <Svg width={24} height={28} viewBox="0 0 24 24" accessible={false}>
        <Path d="M13 2c2 6-4 7-2 11 2-1 3-3 3-5 5 4 7 7 5 11-3 5-11 4-14 0C1 13 7 9 7 6c1 3 2 3 3 4 3-3 1-5 3-8Z" fill="none" stroke={colors.streakContent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <AppText variant="numeric" style={[styles.streakNumber, compact && styles.compactStreakNumber]}>{streakDays ?? '—'}</AppText>
      {!compact ? <AppText variant="label" tone="secondary" style={styles.streakLabel}>day streak</AppText> : null}
    </View>
  </Pressable>;
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44, paddingHorizontal: 2, paddingVertical: spacing.xs },
    compactBanner: { backgroundColor: colors.card, borderRadius: 14, justifyContent: 'center', minWidth: 76, paddingHorizontal: spacing.sm, paddingVertical: 0 },
    copy: { flex: 1 },
    copyStrong: { color: colors.contentPrimary, fontWeight: '800', fontSize: 15, lineHeight: 19 },
    streakDays: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    compactStreakDays: { gap: spacing.xs },
    streakNumber: { color: colors.contentPrimary, fontSize: 27, lineHeight: 28 },
    compactStreakNumber: { fontSize: 19, lineHeight: 24 },
    streakLabel: { fontSize: 12, lineHeight: 15 },
    pressed: { opacity: opacity.pressed },
  });
}
