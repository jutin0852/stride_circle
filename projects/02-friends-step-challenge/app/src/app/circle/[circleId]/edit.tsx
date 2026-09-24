import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { Skeleton } from '@/components/skeleton';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { updateCircle } from '@/lib/circles';
import { colors } from '@/theme';

export default function EditCircleRoute() {
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const [draft, setDraft] = useState<{ circleId: string; description: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!details) return;
    setIsSaving(true);
    try {
      await updateCircle({ circleId: details.circle.id, description: form.description, name: form.name });
      router.back();
    } catch (error) {
      Alert.alert('Could not save circle', getMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (status === 'loading') return <EditSkeleton />;
  if (!details || details.circle.ownerId !== user?.uid) return <View style={styles.unavailable}><Text style={styles.unavailableTitle}>Only the circle owner can edit this circle.</Text><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.cancelButton}><Text style={styles.cancelText}>Go back</Text></Pressable></View>;

  const form = draft?.circleId === details.circle.id ? draft : { circleId: details.circle.id, description: details.circle.description, name: details.circle.name };

  function changeName(name: string) {
    setDraft({ ...form, name });
  }

  function changeDescription(description: string) {
    setDraft({ ...form, description });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.grabber} />
      <Text accessibilityRole="header" style={styles.title}>Edit circle</Text>
      <Text style={styles.subtitle}>Keep the name clear so friends know which group they are joining.</Text>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>CIRCLE NAME</Text>
          <TextInput accessibilityLabel="Circle name" autoCapitalize="words" maxLength={40} onChangeText={changeName} placeholder="e.g. Saturday Walkers" placeholderTextColor={colors.muted} style={styles.input} value={form.name} />
          <Text style={styles.hint}>{form.name.length}/40</Text>
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>DESCRIPTION <Text style={styles.optional}>OPTIONAL</Text></Text>
          <TextInput accessibilityLabel="Circle description" maxLength={140} multiline onChangeText={changeDescription} placeholder="What are you all moving toward?" placeholderTextColor={colors.muted} style={[styles.input, styles.descriptionInput]} textAlignVertical="top" value={form.description} />
          <Text style={styles.hint}>{form.description.length}/140</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" disabled={isSaving || !form.name.trim()} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, (isSaving || !form.name.trim()) && styles.disabled, pressed && !isSaving && styles.pressed]}>
        {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save changes</Text>}
      </Pressable>
    </ScrollView>
  );
}

function EditSkeleton() { return <View style={styles.skeleton}><Skeleton style={{ alignSelf: 'center', height: 5, width: 42 }} /><Skeleton style={{ height: 30, marginTop: 28, width: '55%' }} /><Skeleton style={{ height: 14, marginTop: 11, width: '88%' }} /><Skeleton style={{ height: 12, marginTop: 29, width: 88 }} /><Skeleton style={{ height: 52, marginTop: 9, width: '100%' }} /><Skeleton style={{ height: 12, marginTop: 23, width: 112 }} /><Skeleton style={{ height: 102, marginTop: 9, width: '100%' }} /></View>; }
function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background },
  content: { gap: 16, padding: 24, paddingBottom: 40 },
  skeleton: { backgroundColor: colors.background, flex: 1, padding: 24 },
  grabber: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: 3, height: 5, width: 42 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: -9 },
  form: { gap: 18, marginTop: 9 },
  fieldGroup: { gap: 7 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  optional: { fontWeight: '600' },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 52, paddingHorizontal: 14 },
  descriptionInput: { minHeight: 104, paddingTop: 13 },
  hint: { alignSelf: 'flex-end', color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'], fontWeight: '600' },
  saveButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 15, justifyContent: 'center', marginTop: 5, minHeight: 52, paddingHorizontal: 18 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  unavailable: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  unavailableTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  cancelButton: { backgroundColor: colors.soft, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 11 },
  cancelText: { color: colors.accentPressed, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
