import type { User } from 'firebase/auth';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { getUsernameCooldownEnd, getUsernameError, normalizeUsername, suggestUsername, type PublicProfile } from '@/domain/usernames';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import { changeUsername, claimUsername, getPeopleErrorMessage, setDiscoverable } from '@/lib/people';

type UsernameFormProps = {
  /** Null while the person has no username yet. */
  profile: PublicProfile | null;
  onSaved: () => void;
  submitLabel?: string;
  user: User;
};

/** Picks a first username, or changes one (at most every 30 days). Used in onboarding and Profile. */
export function UsernameForm({ onSaved, profile, submitLabel, user }: UsernameFormProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [value, setValue] = useState(() => profile?.username ?? suggestUsername(user.displayName ?? ''));
  const [discoverable, setDiscoverableValue] = useState(profile?.discoverable ?? true);
  const [now] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = normalizeUsername(value);
  const cooldownEnd = profile ? getUsernameCooldownEnd(profile.usernameChangedAt) : null;
  const lockedUntil = cooldownEnd && cooldownEnd.getTime() > now ? cooldownEnd : null;
  const handleChanged = !profile || handle !== profile.username;
  const validationError = value.trim() ? getUsernameError(value) : null;
  const canSave = !busy && (handleChanged ? !getUsernameError(value) && !lockedUntil : profile !== null && discoverable !== profile.discoverable);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (!profile) await claimUsername({ discoverable, user, username: handle });
      else {
        if (handleChanged) await changeUsername({ currentProfile: profile, user, username: handle });
        if (discoverable !== profile.discoverable) await setDiscoverable({ discoverable, userId: user.uid });
      }
      onSaved();
    } catch (saveError) {
      setError(getPeopleErrorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <AppText tone="tertiary" variant="caption">USERNAME</AppText>
        <View style={[styles.inputRow, lockedUntil && styles.disabled]}>
          <AppText tone="tertiary" variant="body">@</AppText>
          <TextInput
            accessibilityLabel="Username"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy && !lockedUntil}
            maxLength={20}
            onChangeText={(next) => { setValue(next); setError(null); }}
            placeholder="ada.walks"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            value={value}
          />
        </View>
        <AppText accessibilityLiveRegion="polite" tone={validationError || error ? 'danger' : 'tertiary'} variant="caption">
          {error ?? validationError ?? (lockedUntil
            ? `You can change your username again on ${lockedUntil.toLocaleDateString()}.`
            : '3–20 letters, numbers, dots or underscores. People can find you with it.')}
        </AppText>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <AppText variant="label">Show me in Find people</AppText>
          <AppText tone="tertiary" variant="caption">Others can search for your name and username. Turn off to be reachable only by your exact username.</AppText>
        </View>
        <Switch accessibilityLabel="Show me in Find people" disabled={busy} onValueChange={setDiscoverableValue} value={discoverable} />
      </View>

      <Button disabled={!canSave} loading={busy} onPress={() => void save()}>{submitLabel ?? (profile ? 'Save changes' : 'Claim username')}</Button>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    form: { gap: spacing.xl },
    field: { gap: spacing.xs },
    inputRow: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 4, minHeight: 52, paddingHorizontal: 14 },
    input: { color: colors.ink, flex: 1, fontSize: 16, minHeight: 48 },
    disabled: { opacity: 0.6 },
    switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
    switchCopy: { flex: 1, gap: 2 },
  });
}
