import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { spacing } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/use-app-theme';

export type StateCardTone = 'empty' | 'info' | 'warning' | 'error' | 'success';

type StateCardProps = {
  actionLabel?: string;
  description: string;
  icon?: React.ReactNode;
  onAction?: () => void;
  title: string;
  tone?: StateCardTone;
};

const tones: Record<StateCardTone, 'primary' | 'link' | 'warning' | 'danger' | 'success'> = {
  empty: 'primary',
  info: 'link',
  warning: 'warning',
  error: 'danger',
  success: 'success',
};

export function StateCard({ actionLabel, description, icon, onAction, title, tone = 'empty' }: StateCardProps) {
  const { colors } = useAppTheme();
  return (
    <Surface variant={tone === 'error' ? 'outline' : 'soft'}>
      <View style={styles.content}>
        {icon ? <View style={[styles.icon, { backgroundColor: colors.card }]}>{icon}</View> : null}
        <AppText variant="titleSmall" tone={tones[tone]}>{title}</AppText>
        <AppText tone="secondary" variant="bodySmall">{description}</AppText>
        {actionLabel && onAction ? <Button onPress={onAction} size="small" variant={tone === 'error' ? 'danger' : 'tertiary'}>{actionLabel}</Button> : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'flex-start', gap: spacing.md },
  icon: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
});
