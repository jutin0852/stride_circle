import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Surface } from '@/components/ui';
import { dateFromKey } from '@/domain/walking-history';
import { useAppColors } from '@/design-system/use-app-theme';
import { saveWalkingJournalEntry, watchWalkingJournalEntry } from '@/lib/walking-journal';

type JournalStatus = 'loading' | 'ready' | 'error';

export function WalkingJournal({ dateKey, userId }: { dateKey: string; userId: string }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [revision, setRevision] = useState(0);
  const [entry, setEntry] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const dirty = useRef(false);
  const [status, setStatus] = useState<JournalStatus>('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return watchWalkingJournalEntry(
      userId,
      dateKey,
      (next) => {
        const note = next?.note ?? null;
        setEntry(note);
        setDraft((current) => dirty.current ? current : note ?? '');
        setStatus('ready');
      },
      () => setStatus('error'),
    );
  }, [dateKey, revision, userId]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveWalkingJournalEntry({ dateKey, note: draft, userId });
      setEntry(draft.trim() || null);
      dirty.current = false;
    } catch {
      setError('Your note could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(dateFromKey(dateKey));
  const unchanged = (draft.trim() || null) === entry;

  return (
    <Surface padding="lg" radius="lg" style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.copy}>
          <AppText accessibilityRole="header" variant="titleSmall">Walking journal</AppText>
          <AppText tone="secondary" variant="caption">A note for {dateLabel} · only you can see it</AppText>
        </View>
        {status === 'error' ? <Pressable accessibilityRole="button" onPress={() => setRevision((value) => value + 1)}><AppText variant="label" style={styles.retry}>Retry</AppText></Pressable> : null}
      </View>
      <TextInput
        accessibilityLabel={`Private walking note for ${dateLabel}`}
        editable={status === 'ready' && !saving}
        maxLength={500}
        multiline
        onChangeText={(text) => { setDraft(text); dirty.current = true; }}
        placeholder={status === 'error' ? 'Journal unavailable' : 'What stood out about this day?'}
        placeholderTextColor={colors.muted}
        textAlignVertical="top"
        value={draft}
        style={styles.input}
      />
      <View style={styles.footer}>
        <AppText tone="secondary" variant="caption">{draft.length}/500</AppText>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: status !== 'ready' || saving || unchanged }} disabled={status !== 'ready' || saving || unchanged} onPress={() => void save()} style={({ pressed }) => [styles.save, (status !== 'ready' || saving || unchanged) && styles.disabled, pressed && styles.pressed]}>
          <AppText variant="label" style={styles.saveText}>{saving ? 'Saving…' : 'Save note'}</AppText>
        </Pressable>
      </View>
      {error ? <AppText accessibilityRole="alert" tone="danger" variant="caption">{error}</AppText> : null}
    </Surface>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    card: { gap: 12 },
    heading: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    copy: { flex: 1, gap: 3 },
    retry: { color: colors.accentPressed },
    input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 15, lineHeight: 22, minHeight: 92, padding: 13 },
    footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    save: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', minHeight: 42, minWidth: 104, paddingHorizontal: 14 },
    saveText: { color: colors.onAccent },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.78 },
  });
}
