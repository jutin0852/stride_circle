import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/auth-provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="daily-goal" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="profile-character" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.9] }} />
          <Stack.Screen name="circle/[circleId]/actions" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1] }} />
          <Stack.Screen name="circle/[circleId]/edit" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.75, 1] }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
