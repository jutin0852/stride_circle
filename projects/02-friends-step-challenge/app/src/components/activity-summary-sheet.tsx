import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppColors } from '@/design-system/use-app-theme';

type ActivitySummarySheetProps = {
  distanceMeters: number;
  durationMs: number;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  saveError: boolean;
  visible: boolean;
};

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatPace(distanceMeters: number, durationMs: number) {
  if (distanceMeters <= 0) return '—';
  const secondsPerKm = durationMs / 1_000 / (distanceMeters / 1_000);
  return `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`;
}

export function ActivitySummarySheet({ distanceMeters, durationMs, isSaving, onDiscard, onSave, saveError, visible }: ActivitySummarySheetProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const canSave = distanceMeters >= 10;

  return (
    <Modal animationType="slide" onRequestClose={onDiscard} statusBarTranslucent transparent visible={visible}>
      <View accessibilityViewIsModal style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.grabber} />
          <View style={styles.headerRow}>
            <View style={styles.activityIcon}><MaterialCommunityIcons color={colors.accent} name="walk" size={24} /></View>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>WALK COMPLETE</Text><Text accessibilityRole="header" style={styles.title}>Walk summary</Text></View>
          </View>
          <Text style={styles.description}>Review your walk before adding it to your private history.</Text>
          <View style={styles.metrics}>
            <Metric colors={colors} styles={styles} icon="map-outline" label="DISTANCE" value={`${(distanceMeters / 1_000).toFixed(2)} km`} />
            <Metric colors={colors} styles={styles} icon="time-outline" label="DURATION" value={formatDuration(durationMs)} />
            <Metric colors={colors} styles={styles} icon="speedometer-outline" label="AVG. PACE" value={`${formatPace(distanceMeters, durationMs)} /km`} />
          </View>
          {!canSave ? <Text style={styles.warning}>This activity needs at least a few metres of GPS movement before it can be saved.</Text> : saveError ? <Text style={styles.error}>We could not save this yet. Check your connection and try again.</Text> : null}
          <Pressable accessibilityRole="button" disabled={!canSave || isSaving} onPress={onSave} style={({ pressed }) => [styles.saveButton, (!canSave || isSaving) && styles.disabled, pressed && canSave && !isSaving && styles.pressed]}>
            {isSaving ? <ActivityIndicator color={colors.onAccent} /> : <><Text style={styles.saveText}>{saveError ? 'Try saving again' : 'Save to History'}</Text><Ionicons color={colors.onAccent} name="bookmark-outline" size={19} /></>}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={onDiscard} style={({ pressed }) => [styles.discardButton, pressed && !isSaving && styles.discardPressed]}><Text style={styles.discardText}>Discard activity</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Metric({ icon, label, value, colors, styles }: { icon: 'map-outline' | 'time-outline' | 'speedometer-outline'; label: string; value: string; colors: ReturnType<typeof useAppColors>; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.metric}><Ionicons color={colors.accent} name={icon} size={17} /><Text selectable style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  backdrop: { backgroundColor: colors.overlay, flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 11 },
  grabber: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 4, height: 4, width: 38 },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 23 },
  activityIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.7, marginTop: 2 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 14 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 21 },
  metric: { alignItems: 'flex-start', backgroundColor: colors.soft, borderRadius: 16, flex: 1, gap: 5, minHeight: 98, padding: 12 },
  metricValue: { color: colors.ink, fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '900', letterSpacing: -0.3 },
  metricLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  warning: { color: colors.warningContent, fontSize: 12, lineHeight: 17, marginTop: 15, textAlign: 'center' },
  error: { color: colors.dangerContent, fontSize: 12, lineHeight: 17, marginTop: 15, textAlign: 'center' },
  saveButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 22, minHeight: 56 },
  saveText: { color: colors.onAccent, fontSize: 16, fontWeight: '900' },
  discardButton: { alignItems: 'center', justifyContent: 'center', marginTop: 8, minHeight: 46 },
  discardText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  pressed: { backgroundColor: colors.accentPressed, transform: [{ scale: 0.98 }] },
  discardPressed: { opacity: 0.65 },
}); }
