import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  if (!user) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIconStyle: { height: 24, width: 24 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'home' : 'home-outline'} size={24} /> }} />
      <Tabs.Screen name="circle" options={{ title: 'Circles', tabBarLabel: 'Circles', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'account-group' : 'account-group-outline'} size={24} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarLabel: 'Activity', tabBarIcon: ({ color }) => <MaterialCommunityIcons color={color} name="run" size={24} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarLabel: 'History', tabBarIcon: ({ color }) => <MaterialCommunityIcons color={color} name="history" size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarLabel: 'Me', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'account' : 'account-outline'} size={24} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
});
