import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppColors } from '@/design-system/use-app-theme';

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useAppColors();
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.block, { backgroundColor: colors.soft }, style]} />;
}

const styles = StyleSheet.create({ block: { borderRadius: 8 } });
