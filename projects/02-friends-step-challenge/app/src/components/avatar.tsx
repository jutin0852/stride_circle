import { StyleSheet, Text, View } from 'react-native';

import type { Friend } from '@/data/circle';

export function Avatar({ friend, size = 44 }: { friend: Friend; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: friend.color }]}>
      <Text style={[styles.initials, { fontSize: size * 0.3 }]}>{friend.initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontWeight: '800' },
});
