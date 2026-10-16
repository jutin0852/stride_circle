import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import { useOnboardingState } from '@/hooks/use-onboarding-state';
import { completeOnboarding } from '@/lib/onboarding';
import { useAppTheme } from '@/design-system/use-app-theme';

export default function OnboardingRoute() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const onboarding = useOnboardingState(user?.uid);

  if (!user) return <Redirect href="/sign-in" />;
  if (onboarding.status === 'loading') return <View style={[styles.loading, { backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.contentLink} size="large" /></View>;
  if (!onboarding.needsOnboarding) return <Redirect href="/" />;

  return <OnboardingFlow userId={user.uid} onComplete={async (destination, intent) => {
    await completeOnboarding({ intent, userId: user.uid });
    router.replace(destination === 'circle' ? '/circle' : '/');
  }} />;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
