import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { semanticColors, spacing } from '@/design-system/tokens';

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
  return (
    <Surface variant={tone === 'error' ? 'outline' : 'soft'}>
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <AppText variant="titleSmall" tone={tones[tone]}>{title}</AppText>
        <AppText tone="secondary" variant="bodySmall">{description}</AppText>
        {actionLabel && onAction ? <Button onPress={onAction} size="small" variant={tone === 'error' ? 'danger' : 'tertiary'}>{actionLabel}</Button> : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'flex-start', gap: spacing.md },
  icon: { alignItems: 'center', backgroundColor: semanticColors.card, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
});
