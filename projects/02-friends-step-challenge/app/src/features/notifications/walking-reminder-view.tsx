import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconButton, Surface } from '@/components/ui';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import type { ReminderPermission } from '@/domain/walking-reminders';

export type WalkingReminderViewProps = {
  enabled: boolean; time: string; permission: ReminderPermission; loading: boolean; busy: boolean; scheduled: boolean;
  error: string | null; notice: string | null;
  onBack: () => void; onEnabledChange: (enabled: boolean) => void; onTimeChange: (time: string) => void;
  onSave: () => void; onTest: () => void; onOpenSettings: () => void;
};

export function WalkingReminderView(props: WalkingReminderViewProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const unavailable = props.permission === 'unavailable' || props.permission === 'unsupported';
  const blocked = props.permission === 'denied';
  const disabled = props.loading || props.busy;
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg }]} keyboardShouldPersistTaps="handled">
    <IconButton accessibilityLabel="Go back" onPress={props.onBack}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
    <View style={styles.intro}>
      <AppText variant="eyebrow" tone="secondary">YOUR WALKING ROUTINE</AppText>
      <AppText accessibilityRole="header" variant="title">Walking reminders</AppText>
      <AppText tone="secondary">A gentle nudge at a time that works for you. A few steps can be a good start.</AppText>
    </View>
    <Surface padding="lg" style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}><AppText variant="titleSmall">Daily reminder</AppText><AppText variant="bodySmall" tone="secondary">One reminder each day. You’re in control.</AppText></View>
        <Switch accessibilityLabel="Daily walking reminder" disabled={disabled || (unavailable && !props.enabled)} onValueChange={props.onEnabledChange} value={props.enabled} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.card} />
      </View>
      <AppText variant="label">Reminder time</AppText>
      <View style={styles.row}>
        <TextInput accessibilityLabel="Reminder time in 24-hour format" autoCorrect={false} editable={!disabled && !unavailable} keyboardType="numbers-and-punctuation" maxLength={5} onChangeText={props.onTimeChange} placeholder="18:00" placeholderTextColor={colors.placeholder} style={[styles.time, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.soft }]} value={props.time} />
        <View style={styles.copy}><AppText variant="bodySmall" tone="secondary">24-hour time</AppText><AppText variant="caption" tone="secondary">Uses your phone’s local time.</AppText></View>
      </View>
      <View style={styles.presets}>{['08:00', '12:00', '18:00'].map((time) => <Pressable key={time} accessibilityRole="button" accessibilityLabel={`Set reminder time to ${time}`} accessibilityState={{ selected: props.time === time, disabled: disabled || unavailable }} disabled={disabled || unavailable} onPress={() => props.onTimeChange(time)} style={[styles.preset, { borderColor: props.time === time ? colors.accentPressed : colors.border, backgroundColor: props.time === time ? colors.soft : colors.card }]}><AppText variant="label">{time}</AppText></Pressable>)}</View>
    </Surface>
    {unavailable ? <Surface variant="soft" padding="lg"><AppText variant="bodySmall">{props.permission === 'unsupported' ? 'Walking reminders are available in the iPhone and Android app.' : 'Walking reminders need an updated app build. Your current preferences are kept on this device.'}</AppText></Surface> : blocked ? <Surface variant="soft" padding="lg" style={styles.card}><AppText variant="bodySmall">Notifications are turned off in your phone settings. Allow them there to receive your reminder.</AppText><Button onPress={props.onOpenSettings} size="medium" variant="tertiary">Open phone settings</Button></Surface> : <AppText variant="bodySmall" tone="secondary">{props.permission === 'undetermined' ? 'Your phone will ask for notification permission when you save an enabled reminder.' : 'Reminders work offline. Focus mode and your phone’s notification settings may silence them.'}</AppText>}
    {props.error ? <AppText accessibilityRole="alert" tone="danger" variant="bodySmall">{props.error}</AppText> : null}
    {props.notice ? <AppText accessibilityLiveRegion="polite" tone="success" variant="bodySmall">{props.notice}</AppText> : null}
    <Button disabled={props.loading || (unavailable && props.enabled)} loading={props.busy} onPress={props.onSave}>Save reminder</Button>
    <Button disabled={disabled || !props.scheduled || props.permission !== 'granted'} onPress={props.onTest} variant="tertiary">Send a test reminder</Button>
    <AppText variant="caption" tone="secondary">Saved for your account on this phone. Signing out stops reminders; signing back in restores your choice.</AppText>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  intro: { gap: spacing.sm }, card: { gap: spacing.lg },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md }, copy: { flex: 1, gap: spacing.xs },
  time: { borderWidth: 1, borderRadius: 12, fontSize: 24, fontVariant: ['tabular-nums'], minHeight: 56, paddingHorizontal: spacing.md, width: 120 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: { borderRadius: 12, borderWidth: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
});
