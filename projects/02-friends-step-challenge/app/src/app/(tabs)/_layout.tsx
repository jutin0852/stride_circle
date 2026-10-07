import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/auth-provider';
import { fontFamilies, semanticColors } from '@/design-system/tokens';
import { homeColors, homeDarkColors } from '@/features/home/tokens';

export default function TabsLayout() {
  const { isLoading, user } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColorScheme() === 'dark' ? homeDarkColors : homeColors;

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={semanticColors.brandDark} size="large" /></View>;
  }

  if (!user) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.edge,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.ice,
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 6 },
        tabBarLabelStyle: { fontFamily: fontFamilies.bold, fontSize: 11 },
        tabBarIconStyle: { height: 24, width: 24 },
        tabBarStyle: {
          backgroundColor: Platform.OS === 'android' ? colors.panelEdge : colors.canvas,
          borderTopColor: colors.line,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'home' : 'home-outline'} size={24} /> }} />
      <Tabs.Screen name="circle" options={{ title: 'Circles', tabBarLabel: 'Circles', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons color={color} name={focused ? 'account-group' : 'account-group-outline'} size={24} /> }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarLabel: 'History', tabBarIcon: ({ color }) => <MaterialCommunityIcons color={color} name="history" size={24} /> }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', backgroundColor: semanticColors.canvas, flex: 1, justifyContent: 'center' },
});
