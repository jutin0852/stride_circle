import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText, Button, FixedHeaderScreen, IconButton, StateCard, Surface } from '@/components/ui';
import { REPORT_REASONS, isReportTargetType, type ReportReason } from '@/domain/moderation';
import { createCircleReport } from '@/lib/circle-safety';
import { useAuth } from '@/auth/auth-provider';
import { spacing, opacity } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';


const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or bullying',
  unsafe: 'Unsafe behaviour',
  privacy: 'Privacy concern',
  other: 'Something else',
};

export default function CircleReportRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    circleId: string;
    targetId: string;
    targetLabel: string;
    targetPreview?: string;
    targetType: string;
  }>();
  const circleId = firstParam(params.circleId);
  const targetId = firstParam(params.targetId);
  const targetLabel = firstParam(params.targetLabel).slice(0, 100);
  const targetPreview = firstParam(params.targetPreview).slice(0, 500);
  const rawTargetType = firstParam(params.targetType);
  const targetType = isReportTargetType(rawTargetType) ? rawTargetType : null;
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    if (!user || !circleId || !targetId || !targetType || !reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCircleReport({
        circleId,
        details,
        reason,
        reporterId: user.uid,
        targetId,
        targetLabel,
        targetPreview,
        targetType,
      });
      setSubmitted(true);
    } catch {
      setError('We could not send your report. Check your connection, or make sure the item is still available, then try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const title = targetType === 'circle' ? 'Report circle' : targetType === 'message' ? 'Report message' : 'Report member';
  const validTarget = Boolean(user && circleId && targetId && targetType && targetLabel);

  return (
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
        <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">{submitted ? 'Report received' : title}</AppText>
        <View style={styles.headerSpacer} />
      </View>}
      headerStyle={styles.headerContainer}
    >
      {!validTarget ? <StateCard description="This item is no longer available to report." title="Report unavailable" /> : submitted ? (
        <Surface padding="lg" radius="lg" variant="soft" style={styles.confirmation}>
          <View style={styles.confirmationIcon}><Ionicons color={colors.success} name="checkmark" size={23} /></View>
          <AppText variant="titleSmall">Thank you for letting us know.</AppText>
          <AppText tone="secondary" variant="bodySmall">The circle’s owner and moderators can review this report. Your report is kept within the circle’s safety review.</AppText>
          <Button onPress={() => router.back()} size="medium" variant="secondary">Done</Button>
        </Surface>
      ) : (
        <>
          <AppText tone="secondary" variant="bodySmall">Choose the reason that best fits. Reports are visible to the circle’s owner and moderators. Please don’t include private health or location details.</AppText>
          <Surface padding="lg" radius="lg" variant="outline" style={styles.targetCard}>
            <AppText variant="label">{targetLabel}</AppText>
            {targetPreview ? <AppText selectable tone="secondary" variant="bodySmall">{targetPreview}</AppText> : null}
          </Surface>

          <AppText accessibilityRole="header" style={styles.sectionTitle} variant="titleSmall">Why are you reporting this?</AppText>
          <View style={styles.reasons}>
            {REPORT_REASONS.map((item) => {
              const selected = item === reason;
              return <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={item}
                onPress={() => setReason(item)}
                style={({ pressed }) => [styles.reason, selected && styles.reasonSelected, pressed && styles.pressed]}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                <AppText style={styles.reasonText} variant="label">{REASON_LABELS[item]}</AppText>
              </Pressable>;
            })}
          </View>

          <View style={styles.detailsLabel}>
            <AppText style={styles.sectionTitle} variant="titleSmall">Anything else? <AppText tone="secondary" variant="caption">Optional</AppText></AppText>
          </View>
          <TextInput
            accessibilityLabel="Additional report details"
            maxLength={500}
            multiline
            onChangeText={setDetails}
            placeholder="Add context that could help the moderators review this."
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            textAlignVertical="top"
            value={details}
          />
          <AppText accessibilityLiveRegion="polite" tone={error ? 'danger' : 'tertiary'} variant="caption">{error ?? (details.length + '/500')}</AppText>
          <Button disabled={!reason || submitting} loading={submitting} onPress={() => void submitReport()} size="large" variant="danger">Send report</Button>
        </>
      )}
    </FixedHeaderScreen>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  headerContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  headerSpacer: { width: 44 },
  title: { color: colors.ink, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.xxxl },
  targetCard: { gap: spacing.sm },
  sectionTitle: { color: colors.ink },
  reasons: { gap: spacing.sm },
  reason: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 52, paddingHorizontal: spacing.md },
  reasonSelected: { backgroundColor: colors.soft, borderColor: colors.borderSelected },
  reasonText: { flex: 1 },
  radio: { alignItems: 'center', borderColor: colors.muted, borderRadius: 10, borderWidth: 1.5, height: 20, justifyContent: 'center', width: 20 },
  radioSelected: { borderColor: colors.borderSelected },
  radioDot: { backgroundColor: colors.borderSelected, borderRadius: 5, height: 10, width: 10 },
  detailsLabel: { marginTop: spacing.xs },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 15, lineHeight: 21, minHeight: 112, padding: spacing.md },
  confirmation: { alignItems: 'flex-start', gap: spacing.md },
  confirmationIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  pressed: { opacity: opacity.pressed },
}); }
