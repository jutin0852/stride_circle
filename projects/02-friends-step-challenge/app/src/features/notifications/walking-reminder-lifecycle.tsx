import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { observeWalkingReminderTaps } from '@/services/notifications/notification-device';
import { walkingReminders } from '@/services/notifications/walking-reminders';

export function WalkingReminderLifecycle() {
  const { user, isLoading } = useAuth();
  const navigation = useRootNavigationState();
  useEffect(() => {
    if (isLoading || !user || !navigation?.key) return;
    const stopObserving = observeWalkingReminderTaps(user.uid, () => router.push('/'));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void walkingReminders.refresh().catch(() => {});
    });
    return () => { stopObserving(); subscription.remove(); };
  }, [isLoading, navigation?.key, user]);
  return null;
}
