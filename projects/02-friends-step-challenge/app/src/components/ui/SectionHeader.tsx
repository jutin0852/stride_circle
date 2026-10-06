import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/design-system/tokens';

type SectionHeaderProps = {
  action?: React.ReactNode;
  title: string;
};

export function SectionHeader({ action, title }: SectionHeaderProps) {
  return <View style={styles.row}><AppText variant="titleSmall">{title}</AppText>{action}</View>;
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
});
