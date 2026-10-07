import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/design-system/use-app-theme';

export function Divider() {
  const { colors } = useAppTheme();
  return <View accessibilityElementsHidden importantForAccessibility="no" style={[styles.divider, { backgroundColor: colors.divider }]} />;
}

const styles = StyleSheet.create({
  divider: { height: 1, width: '100%' },
});
