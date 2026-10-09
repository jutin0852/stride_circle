import '../global.css';

import { NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold, useFonts } from '@expo-google-fonts/nunito-sans';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { PanelUIProvider } from 'panelui-native/provider';

import { AuthProvider } from '@/auth/auth-provider';
import { installTypographyDefaults } from '@/design-system/typography';
import { WalkingReminderLifecycle } from '@/features/notifications/walking-reminder-lifecycle';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold, NunitoSans_800ExtraBold });
  const isDark = useColorScheme() === 'dark';

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;
  installTypographyDefaults();

  return (
    <PanelUIProvider background={false}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <WalkingReminderLifecycle />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="global-leaderboard" />
            <Stack.Screen name="daily-goal" />
            <Stack.Screen name="walking-reminders" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="profile-character" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.9] }} />
            <Stack.Screen name="circle/[circleId]/actions" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1] }} />
            <Stack.Screen name="circle/[circleId]/edit" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75, 1] }} />
            <Stack.Screen name="circle/[circleId]/walks" />
            <Stack.Screen name="circle/[circleId]/weekly-goal" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </PanelUIProvider>
  );
}
