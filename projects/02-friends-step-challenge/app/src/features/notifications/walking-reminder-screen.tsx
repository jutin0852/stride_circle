import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { router } from 'expo-router';

import { DEFAULT_WALKING_REMINDER, parseReminderTime, reminderTimeText } from '@/domain/walking-reminders';
import type { ReminderStatus } from '@/services/notifications/walking-reminder-service';
import { walkingReminders } from '@/services/notifications/walking-reminders';
import { WalkingReminderView } from './walking-reminder-view';

export function WalkingReminderScreen({ userId }: { userId: string }) {
  const [status, setStatus] = useState<ReminderStatus>({ preferences: DEFAULT_WALKING_REMINDER, permission: 'undetermined', scheduled: false });
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(reminderTimeText(DEFAULT_WALKING_REMINDER));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const initialized = useRef(false);
  const mounted = useRef(true);

  const refresh = useCallback(() => walkingReminders.refresh().then((next) => {
      if (!mounted.current) return;
      setStatus(next);
      if (!initialized.current) {
        setEnabled(next.preferences.enabled);
        setTime(reminderTimeText(next.preferences));
        initialized.current = true;
      }
  }).catch(() => {
    if (mounted.current) setError('Your reminder settings could not load. Open this page again to retry.');
  }).finally(() => {
    if (mounted.current) setLoading(false);
  }), []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { mounted.current = false; subscription.remove(); };
  }, [refresh]);

  async function save() {
    const parsedTime = parseReminderTime(time) ?? (!enabled ? { hour: status.preferences.hour, minute: status.preferences.minute } : null);
    setError(null); setNotice(null);
    if (!parsedTime) { setError('Enter a valid time, such as 08:30 or 18:00.'); return; }
    setBusy(true);
    try {
      const next = await walkingReminders.save(userId, { enabled, ...parsedTime });
      if (!mounted.current) return;
      setStatus(next); setTime(reminderTimeText(parsedTime));
      setNotice(enabled ? `Daily reminder saved for ${reminderTimeText(parsedTime)}.` : 'Walking reminders are off.');
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : 'Your reminder could not be saved. Please try again.');
      await refresh();
    } finally { if (mounted.current) setBusy(false); }
  }

  async function test() {
    setBusy(true); setError(null); setNotice(null);
    try {
      await walkingReminders.test(userId);
      if (mounted.current) setNotice('A test reminder will arrive in about 5 seconds.');
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'The test reminder could not be sent.'); }
    finally { if (mounted.current) setBusy(false); }
  }

  return <WalkingReminderView enabled={enabled} time={time} permission={status.permission} loading={loading} busy={busy} scheduled={status.scheduled}
    error={error} notice={notice} onBack={() => router.back()}
    onEnabledChange={(value) => { setEnabled(value); setNotice(null); }} onTimeChange={(value) => { setTime(value); setNotice(null); }}
    onSave={() => void save()} onTest={() => void test()}
    onOpenSettings={() => { void Linking.openSettings().catch(() => setError('Phone settings could not open. Open Settings manually to allow notifications.')); }} />;
}
