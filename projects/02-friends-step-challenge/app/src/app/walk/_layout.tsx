import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/auth-provider';
import { useAppColors } from '@/design-system/use-app-theme';

export default function WalkLayout() {
  const { user, isLoading } = useAuth(); const colors = useAppColors();
  if (isLoading) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  if (!user) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
