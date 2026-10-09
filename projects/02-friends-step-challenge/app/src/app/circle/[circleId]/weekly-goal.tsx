import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { updateCircleWeeklyStepGoal } from '@/lib/circles';
import { useAppColors } from '@/design-system/use-app-theme';

const PRESETS = [50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000];

export default function CircleWeeklyGoalRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const current = details?.circle.weeklyStepGoal ?? 100_000;
  const chosen = custom ? Number(custom.replace(/[^0-9]/g, '')) : selected ?? current;
  const owner = details?.circle.ownerId === user?.uid;

  async function save() {
    if (!circleId || !Number.isInteger(chosen) || chosen < 10_000 || chosen > 5_000_000) {
      Alert.alert('Choose a valid target', 'The shared weekly target must be between 10,000 and 5,000,000 steps.');
      return;
    }
    setSaving(true);
    try {
      await updateCircleWeeklyStepGoal({ circleId, weeklyStepGoal: chosen });
      router.back();
    } catch {
      Alert.alert('Could not save target', 'The shared weekly target could not be updated. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>;
  if (!details) return <View style={styles.loading}><Text style={styles.muted}>This circle is unavailable.</Text></View>;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.nav}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable></View>
    <Text style={styles.eyebrow}>{details.circle.name.toUpperCase()}</Text>
    <Text style={styles.title}>Shared weekly goal</Text>
    <Text style={styles.description}>The circle’s combined steps from its competition week count toward this target.</Text>
    {owner ? <>
      <Text style={styles.section}>Choose a target</Text>
      <View style={styles.presets}>{PRESETS.map((value) => <Pressable accessibilityRole="button" accessibilityState={{ selected: chosen === value && !custom }} key={value} onPress={() => { setSelected(value); setCustom(''); }} style={({ pressed }) => [styles.preset, chosen === value && !custom && styles.presetActive, pressed && styles.pressed]}><Text style={[styles.presetValue, chosen === value && !custom && styles.activeText]}>{value.toLocaleString()}</Text><Text style={[styles.presetLabel, chosen === value && !custom && styles.activeText]}>steps</Text></Pressable>)}</View>
      <Text style={styles.section}>Custom target</Text>
      <View style={[styles.custom, custom && styles.presetActive]}><TextInput accessibilityLabel="Custom shared weekly step target" keyboardType="number-pad" maxLength={7} onChangeText={(value) => { setCustom(value); setSelected(null); }} placeholder={current.toLocaleString()} placeholderTextColor={colors.muted} style={styles.input} value={custom} /><Text style={styles.presetLabel}>steps</Text></View>
      <View style={styles.note}><Ionicons color={colors.accent} name="people-outline" size={18} /><Text style={styles.noteText}>Progress uses each current member’s steps synced for this competition week.</Text></View>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.save, saving && styles.disabled, pressed && !saving && styles.pressed]}>{saving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Save shared goal</Text>}</Pressable>
    </> : <View style={styles.note}><Ionicons color={colors.accent} name="lock-closed-outline" size={18} /><Text style={styles.noteText}>Only the circle owner can set or change the shared weekly target.</Text></View>}
  </ScrollView>;
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 }, content: { gap: 14, padding: 24, paddingBottom: 48 }, nav: { flexDirection: 'row' }, back: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }, eyebrow: { color: colors.accentPressed, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 }, description: { color: colors.muted, fontSize: 15, lineHeight: 21 }, section: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 8 }, presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, preset: { borderColor: colors.border, borderRadius: 15, borderWidth: 1, gap: 3, padding: 13, width: '31%' }, presetActive: { backgroundColor: colors.soft, borderColor: colors.accent, borderWidth: 2, padding: 12 }, presetValue: { color: colors.ink, fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '800' }, presetLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, activeText: { color: colors.accentPressed }, custom: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', paddingHorizontal: 13 }, input: { color: colors.ink, flex: 1, fontSize: 17, minHeight: 52 }, note: { alignItems: 'flex-start', backgroundColor: colors.soft, borderRadius: 16, flexDirection: 'row', gap: 10, marginTop: 8, padding: 15 }, noteText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 }, save: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, justifyContent: 'center', marginTop: 10, minHeight: 54 }, saveText: { color: colors.onAccent, fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.8 }, muted: { color: colors.muted },
}); }
