import { Tabs } from 'expo-router';

import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, tabBarActiveTintColor: colors.coralDark, tabBarInactiveTintColor: '#948A83', tabBarStyle: { borderTopColor: '#ECE6DE' } }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarLabel: 'Today' }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarLabel: 'History' }} />
      <Tabs.Screen name="circle" options={{ title: 'Circle', tabBarLabel: 'Circle' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
