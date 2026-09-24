import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { getAuthErrorMessage } from '@/lib/auth';
import { DAILY_STEP_GOAL_PRESETS, isValidDailyStepGoal, saveDailyStepGoal } from '@/lib/movement-goals';
import { useDailyStepGoal } from '@/hooks/use-daily-step-goal';
import { colors } from '@/theme';

export default function DailyGoalRoute() {
  const { user } = useAuth();
  const { goal } = useDailyStepGoal(user?.uid);
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [customGoal, setCustomGoal] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const parsedCustomGoal = Number(customGoal.replace(/[^0-9]/g, ''));
  const chosenGoal = customGoal ? parsedCustomGoal : selectedGoal ?? goal;

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

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.nav}><Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Ionicons color={colors.ink} name="chevron-back" size={22} /></Pressable></View>
      <Text style={styles.eyebrow}>PERSONAL MOVEMENT</Text>
      <Text style={styles.title}>Daily step goal</Text>
      <Text style={styles.description}>Choose a target that makes you want to move—not one that makes you feel behind.</Text>

      <Text style={styles.sectionTitle}>Suggested goals</Text>
      <View style={styles.presets}>{DAILY_STEP_GOAL_PRESETS.map((preset) => <Pressable accessibilityRole="button" key={preset} onPress={() => { setSelectedGoal(preset); setCustomGoal(''); }} style={({ pressed }) => [styles.preset, !customGoal && chosenGoal === preset && styles.presetActive, pressed && styles.pressed]}><Text style={[styles.presetValue, !customGoal && chosenGoal === preset && styles.presetValueActive]}>{preset.toLocaleString('en-US')}</Text><Text style={[styles.presetLabel, !customGoal && chosenGoal === preset && styles.presetValueActive]}>steps</Text></Pressable>)}</View>

      <Text style={styles.sectionTitle}>Custom goal</Text>
      <View style={[styles.customCard, customGoal && styles.customCardActive]}>
        <TextInput accessibilityLabel="Custom daily step goal" keyboardType="number-pad" maxLength={6} onChangeText={(value) => { setCustomGoal(value); setSelectedGoal(null); }} placeholder={goal.toLocaleString('en-US')} placeholderTextColor={colors.muted} style={styles.input} value={customGoal} />
        <Text style={styles.customSuffix}>steps</Text>
      </View>

      <View style={styles.note}><Ionicons color={colors.accent} name="flame-outline" size={18} /><Text style={styles.noteText}>A day counts toward your streak when you reach this goal.</Text></View>
      <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void handleSave()} style={({ pressed }) => [styles.saveButton, isSaving && styles.disabled, pressed && !isSaving && styles.pressed]}>{isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save daily goal</Text>}</Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 40 }, nav: { flexDirection: 'row' }, backButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1.1 }, description: { color: colors.muted, fontSize: 15, lineHeight: 21, maxWidth: 340 }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 12 }, presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, preset: { alignItems: 'flex-start', borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 2, padding: 14, width: '30.8%' }, presetActive: { backgroundColor: '#EAF0FF', borderColor: colors.accent, borderWidth: 2, padding: 13 }, presetValue: { color: colors.ink, fontSize: 17, fontVariant: ['tabular-nums'], fontWeight: '800' }, presetValueActive: { color: colors.accentPressed }, presetLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' }, customCard: { alignItems: 'center', borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingHorizontal: 14 }, customCardActive: { borderColor: colors.accent, borderWidth: 2, paddingHorizontal: 13 }, input: { color: colors.ink, flex: 1, fontSize: 18, fontVariant: ['tabular-nums'], minHeight: 54 }, customSuffix: { color: colors.muted, fontSize: 14, fontWeight: '700' }, note: { alignItems: 'flex-start', backgroundColor: colors.soft, borderRadius: 16, flexDirection: 'row', gap: 9, marginTop: 8, padding: 15 }, noteText: { color: colors.muted, flex: 1, fontSize: 13, lineHeight: 19 }, saveButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, justifyContent: 'center', marginTop: 12, minHeight: 55 }, saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.6 }, pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
