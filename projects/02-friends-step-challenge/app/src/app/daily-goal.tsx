import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { getAuthErrorMessage } from '@/lib/auth';
import { DAILY_STEP_GOAL_PRESETS, isValidDailyStepGoal, isValidWeeklyStepGoal, saveDailyStepGoal, saveWeeklyStepGoal, WEEKLY_STEP_GOAL_PRESETS } from '@/lib/movement-goals';
import { useDailyStepGoal } from '@/hooks/use-daily-step-goal';
import { useWeeklyStepGoal } from '@/hooks/use-weekly-step-goal';
import { useAppColors } from '@/design-system/use-app-theme';

export default function DailyGoalRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { goal } = useDailyStepGoal(user?.uid);
  const weekly = useWeeklyStepGoal(user?.uid);
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [customGoal, setCustomGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWeeklyGoal, setSelectedWeeklyGoal] = useState<number | null>(null);
  const [customWeeklyGoal, setCustomWeeklyGoal] = useState('');
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);

  const parsedCustomGoal = Number(customGoal.replace(/[^0-9]/g, ''));
  const chosenGoal = customGoal ? parsedCustomGoal : selectedGoal ?? goal;
  const parsedCustomWeeklyGoal = Number(customWeeklyGoal.replace(/[^0-9]/g, ''));
  const chosenWeeklyGoal = customWeeklyGoal ? parsedCustomWeeklyGoal : selectedWeeklyGoal ?? weekly.goal;

  async function handleSave() {
    if (!user) return;
    if (!isValidDailyStepGoal(chosenGoal)) {
      Alert.alert('Choose a valid goal', 'Enter a whole number between 1,000 and 100,000 steps.');
      return;
    }

    setIsSaving(true);
    try {
      await saveDailyStepGoal({ goal: chosenGoal, userId: user.uid });
      router.back();
    } catch (error) {
      Alert.alert('Could not save goal', getAuthErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveWeekly() {
    if (!user) return;
    if (!isValidWeeklyStepGoal(chosenWeeklyGoal)) {
      Alert.alert('Choose a valid goal', 'Enter a whole number between 7,000 and 700,000 steps.');
      return;
    }

    setIsSavingWeekly(true);
    try {
      await saveWeeklyStepGoal({ goal: chosenWeeklyGoal, userId: user.uid });
      router.back();
    } catch (error) {
      Alert.alert('Could not save goal', getAuthErrorMessage(error));
    } finally {
      setIsSavingWeekly(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.nav}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable></View>
      <Text style={styles.eyebrow}>PERSONAL MOVEMENT</Text>
      <Text style={styles.title}>Step goals</Text>
      <Text style={styles.description}>Set a daily rhythm and a weekly target that fit the way you like to move.</Text>

      <Text style={styles.sectionTitle}>Daily goal</Text>
      <View style={styles.presets}>{DAILY_STEP_GOAL_PRESETS.map((preset) => <Pressable accessibilityRole="button" key={preset} onPress={() => { setSelectedGoal(preset); setCustomGoal(''); }} style={({ pressed }) => [styles.preset, !customGoal && chosenGoal === preset && styles.presetActive, pressed && styles.pressed]}><Text style={[styles.presetValue, !customGoal && chosenGoal === preset && styles.presetValueActive]}>{preset.toLocaleString('en-US')}</Text><Text style={[styles.presetLabel, !customGoal && chosenGoal === preset && styles.presetValueActive]}>steps</Text></Pressable>)}</View>

      <Text style={styles.sectionTitle}>Custom goal</Text>
      <View style={[styles.customCard, customGoal && styles.customCardActive]}>
        <TextInput accessibilityLabel="Custom daily step goal" keyboardType="number-pad" maxLength={6} onChangeText={(value) => { setCustomGoal(value); setSelectedGoal(null); }} placeholder={goal.toLocaleString('en-US')} placeholderTextColor={colors.muted} style={styles.input} value={customGoal} />
        <Text style={styles.customSuffix}>steps</Text>
      </View>

      <View style={styles.note}><Ionicons color={colors.accent} name="flame-outline" size={18} /><Text style={styles.noteText}>A day counts toward your streak when you reach this goal.</Text></View>
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void handleSave()} style={({ pressed }) => [styles.saveButton, isSaving && styles.disabled, pressed && !isSaving && styles.pressed]}>{isSaving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Save daily goal</Text>}</Pressable>

      <View style={styles.sectionDivider} />
      <Text style={styles.sectionTitle}>Weekly target</Text>
      <Text style={styles.weeklyDescription}>A separate total for Monday through Sunday. It helps you track steady progress without needing the same number every day.</Text>
      <View style={styles.presets}>{WEEKLY_STEP_GOAL_PRESETS.map((preset) => <Pressable accessibilityRole="button" key={preset} onPress={() => { setSelectedWeeklyGoal(preset); setCustomWeeklyGoal(''); }} style={({ pressed }) => [styles.preset, !customWeeklyGoal && chosenWeeklyGoal === preset && styles.presetActive, pressed && styles.pressed]}><Text style={[styles.presetValue, !customWeeklyGoal && chosenWeeklyGoal === preset && styles.presetValueActive]}>{preset.toLocaleString('en-US')}</Text><Text style={[styles.presetLabel, !customWeeklyGoal && chosenWeeklyGoal === preset && styles.presetValueActive]}>steps</Text></Pressable>)}</View>
      <Text style={styles.sectionTitle}>Custom weekly target</Text>
      <View style={[styles.customCard, customWeeklyGoal && styles.customCardActive]}>
        <TextInput accessibilityLabel="Custom weekly step goal" keyboardType="number-pad" maxLength={7} onChangeText={(value) => { setCustomWeeklyGoal(value); setSelectedWeeklyGoal(null); }} placeholder={weekly.goal.toLocaleString('en-US')} placeholderTextColor={colors.muted} style={styles.input} value={customWeeklyGoal} />
        <Text style={styles.customSuffix}>steps / week</Text>
      </View>
      <View style={styles.note}><Ionicons color={colors.accent} name="calendar-outline" size={18} /><Text style={styles.noteText}>Your weekly progress follows the Monday-to-Sunday calendar used in History.</Text></View>
      <Pressable accessibilityRole="button" disabled={isSavingWeekly || weekly.status === 'loading'} onPress={() => void handleSaveWeekly()} style={({ pressed }) => [styles.saveButton, isSavingWeekly && styles.disabled, pressed && !isSavingWeekly && styles.pressed]}>{isSavingWeekly ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Save weekly target</Text>}</Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 40 }, nav: { flexDirection: 'row' }, backButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1.1 }, description: { color: colors.muted, fontSize: 15, lineHeight: 21, maxWidth: 340 }, weeklyDescription: { color: colors.muted, fontSize: 14, lineHeight: 20 }, sectionDivider: { backgroundColor: colors.border, height: 1, marginTop: 8 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 12 }, presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, preset: { alignItems: 'flex-start', borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 2, padding: 14, width: '30.8%' }, presetActive: { backgroundColor: colors.soft, borderColor: colors.accent, borderWidth: 2, padding: 13 }, presetValue: { color: colors.ink, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '800' }, presetValueActive: { color: colors.accentPressed }, presetLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' }, customCard: { alignItems: 'center', borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingHorizontal: 14 }, customCardActive: { borderColor: colors.accent, borderWidth: 2, paddingHorizontal: 13 }, input: { color: colors.ink, flex: 1, fontSize: 18, fontVariant: ['tabular-nums'], minHeight: 54 }, customSuffix: { color: colors.muted, fontSize: 14, fontWeight: '700' }, note: { alignItems: 'flex-start', backgroundColor: colors.soft, borderRadius: 16, flexDirection: 'row', gap: 9, marginTop: 8, padding: 15 }, noteText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 }, saveButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, justifyContent: 'center', marginTop: 12, minHeight: 55 }, saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.6 }, pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
}); }
