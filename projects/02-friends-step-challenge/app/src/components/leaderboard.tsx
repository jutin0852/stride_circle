import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';
import { formatSteps, type Friend } from '@/data/circle';
import { Avatar } from './avatar';

export function Leaderboard({ friends }: { friends: Friend[] }) {
  return (
    <View style={styles.card}>
      {friends.map((friend, index) => (
        <View key={friend.name} style={[styles.row, friend.isYou && styles.youRow]}>
          <Text selectable style={[styles.rank, index === 0 && styles.firstRank]}>{index + 1}</Text>
          <Avatar friend={friend} />
          <View style={styles.nameColumn}>
            <Text selectable style={[styles.name, friend.isYou && styles.youText]}>{friend.name}</Text>
            {index === 0 && <Text style={styles.caption}>Leading today</Text>}
          </View>
          <Text selectable style={[styles.steps, friend.isYou && styles.youText]}>{formatSteps(friend.steps)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomColor: '#F1ECE5', borderBottomWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: 15 },
  youRow: { backgroundColor: '#FFF1EC' },
  rank: { color: '#968B82', fontSize: 15, fontWeight: '800', textAlign: 'center', width: 28 },
  firstRank: { color: '#E49A2B' },
  nameColumn: { flex: 1, marginLeft: 11 },
  name: { color: '#2A2727', fontSize: 15, fontWeight: '700' },
  youText: { color: colors.coralDark },
  caption: { color: '#9B8E84', fontSize: 11, fontWeight: '600', marginTop: 2 },
  steps: { color: '#2A2727', fontSize: 15, fontVariant: ['tabular-nums'], fontWeight: '800' },
});
