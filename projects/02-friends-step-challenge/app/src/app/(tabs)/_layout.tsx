import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { useOnboardingState } from '@/hooks/use-onboarding-state';
import { fontFamilies } from '@/design-system/tokens';
import { homeTheme } from '@/features/home/tokens';
import { AnimatedTabBar } from '@/components/animated-tab-bar';

export default function TabsLayout() {
  const { isLoading, user } = useAuth();
  const onboarding = useOnboardingState(user?.uid);
  const insets = useSafeAreaInsets();
  const colors = homeTheme(useColorScheme() === 'dark');

  if (isLoading || (user && onboarding.status === 'loading')) {
    return <View style={[styles.loading, { backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.edge} size="large" /></View>;
  }

  if (!user) return <Redirect href="/sign-in" />;
  if (onboarding.needsOnboarding) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.edge,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 6 },
        tabBarLabelStyle: { fontFamily: fontFamilies.bold, fontSize: 11 },
        tabBarIconStyle: { height: 24, width: 24 },
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: colors.line,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'home' : 'home-outline'} size={24} /> }} />
      <Tabs.Screen name="circle" options={{ title: 'Circles', tabBarLabel: 'Circles', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'account-group' : 'account-group-outline'} size={24} /> }} />
      <Tabs.Screen name="activity" options={{ lazy: false, title: 'Activity', tabBarLabel: 'Activity', tabBarIcon: ({ color }) => <MaterialCommunityIcons color={color} name="walk" size={24} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarLabel: 'History', tabBarIcon: ({ color }) => <MaterialCommunityIcons color={color} name="history" size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'account' : 'account-outline'} size={24} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
