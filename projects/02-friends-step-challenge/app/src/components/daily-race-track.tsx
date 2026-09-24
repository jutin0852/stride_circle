import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { type Friend, formatSteps } from '@/data/circle';
import { colors } from '@/theme';
import { Avatar } from './avatar';

type DailyRaceTrackProps = {
  isCurrentDay: boolean;
  friends: Friend[];
};

/**
 * The course is intentionally open-ended. It visualises today's relative
 * movement instead of suggesting that a member must reach a fixed target.
 */
export function DailyRaceTrack({ friends, isCurrentDay }: DailyRaceTrackProps) {
  const highestSteps = Math.max(...friends.map((friend) => friend.steps), 0);
  const first = friends[0];
  const second = friends[1];
  const leader = first && first.steps > 0 && (!second || first.steps > second.steps) ? first : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>Today’s track</Text>
          <Text style={styles.subtitle}>
            {leader
              ? isCurrentDay
                ? leader.isYou ? 'You are holding the badge.' : `${leader.name} is holding the badge.`
                : leader.isYou ? 'You won this day.' : `${leader.name} won this day.`
              : highestSteps === 0
                ? isCurrentDay ? 'First to move takes the badge.' : 'No movement was recorded this day.'
                : isCurrentDay ? 'The lead is tied right now.' : 'This day ended in a tie.'}
          </Text>
        </View>
        {isCurrentDay ? <View accessibilityLabel="Live updates" accessibilityRole="image" style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View> : <View style={styles.finalPill}><Text style={styles.finalText}>FINAL</Text></View>}
      </View>

      <View style={styles.course}>
        <View style={styles.startMarker}>
          <View style={styles.startLine} />
          <Text style={styles.startText}>START</Text>
        </View>
        {friends.map((friend) => {
          const progress = getTrackProgress(friend.steps, highestSteps);
          const isLeader = leader?.id === friend.id && leader?.name === friend.name;

          return (
            <View key={friend.id ?? friend.name} style={styles.racerRow}>
              <Text numberOfLines={1} selectable style={[styles.racerName, friend.isYou && styles.youText]}>
                {friend.name}
              </Text>
              <View accessibilityLabel={`${friend.name}: ${formatSteps(friend.steps)} steps`} accessibilityRole="image" style={styles.lane}>
                <View style={styles.laneLine} />
                <View style={[styles.avatarPosition, { left: `${progress}%` }]}>
                  {isCurrentDay && isLeader ? <View accessibilityLabel={`${friend.name} holds the daily leader badge`} accessibilityRole="image" style={styles.medal}><MaterialCommunityIcons color="#FFFFFF" name="medal" size={12} /></View> : null}
                  <Avatar friend={friend} size={34} />
                </View>
              </View>
              <Text selectable style={[styles.steps, friend.isYou && styles.youText]}>{formatSteps(friend.steps)}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.note}>{isCurrentDay ? 'Positions reset tomorrow. The person ahead at day’s end wins today.' : 'These are the final steps recorded for this day.'}</Text>
    </View>
  );
}

function getTrackProgress(steps: number, highestSteps: number) {
  if (highestSteps === 0) return 8;
  return 8 + (steps / highestSteps) * 76;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: 18, overflow: 'hidden', padding: 18 },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 3 },
  livePill: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 99, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { backgroundColor: colors.accent, borderRadius: 4, height: 7, width: 7 },
  liveText: { color: colors.accentPressed, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  finalPill: { backgroundColor: colors.soft, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  finalText: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  course: { gap: 10 },
  startMarker: { alignItems: 'center', flexDirection: 'row', gap: 5, marginLeft: 67 },
  startLine: { backgroundColor: colors.border, height: 10, width: 2 },
  startText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  racerRow: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 42 },
  racerName: { color: colors.ink, fontSize: 12, fontWeight: '700', width: 58 },
  lane: { flex: 1, height: 42, overflow: 'hidden', position: 'relative' },
  laneLine: { borderColor: '#CFE0FF', borderStyle: 'dashed', borderTopWidth: 2, left: 0, position: 'absolute', right: 0, top: 20 },
  avatarPosition: { marginLeft: -17, position: 'absolute', top: 3 },
  medal: { alignItems: 'center', backgroundColor: colors.accentPressed, borderColor: '#FFFFFF', borderRadius: 10, borderWidth: 2, height: 20, justifyContent: 'center', position: 'absolute', right: -6, top: -8, width: 20, zIndex: 2 },
  steps: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'], fontWeight: '800', textAlign: 'right', width: 42 },
  youText: { color: colors.accentPressed },
  note: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
