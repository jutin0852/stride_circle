import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.block, style]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.soft, borderRadius: 8 },
});
