import { StyleSheet, View } from 'react-native';

import { semanticColors } from '@/design-system/tokens';

export function Divider() {
  return <View accessibilityElementsHidden importantForAccessibility="no" style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: { backgroundColor: semanticColors.divider, height: 1, width: '100%' },
});
