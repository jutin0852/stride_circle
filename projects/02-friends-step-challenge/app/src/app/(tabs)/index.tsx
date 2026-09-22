import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Leaderboard } from '@/components/leaderboard';
import { friends, formatSteps } from '@/data/circle';
import { colors } from '@/theme';

export default function TodayRoute() {
  const [yourSteps, setYourSteps] = useState(6842);
  const standings = useMemo(() => friends.map(friend => friend.isYou ? { ...friend, steps: yourSteps } : friend).sort((a, b) => b.steps - a.steps), [yourSteps]);
  const rank = standings.findIndex(friend => friend.isYou) + 1;
  const gap = standings[0].steps - yourSteps;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
    <Text style={styles.eyebrow}>MONDAY, SEPTEMBER 22</Text>
    <Text style={styles.title}>Keep moving.</Text>
    <View style={styles.hero}><Text style={styles.heroLabel}>YOUR STEPS TODAY</Text><Text selectable style={styles.heroNumber}>{formatSteps(yourSteps)}</Text><Text style={styles.heroRank}>#{rank} in Weekend Walkers</Text><Text style={styles.heroMessage}>{gap > 0 ? `${formatSteps(gap)} steps to take first place.` : 'You are leading the circle. Keep it up.'}</Text><Pressable style={styles.button} onPress={() => setYourSteps(steps => steps + 248)}><Text style={styles.buttonText}>Sync steps</Text><Text style={styles.buttonText}>→</Text></Pressable></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Today’s leaderboard</Text><Text style={styles.muted}>6 friends</Text></View>
    <Leaderboard friends={standings} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 }, hero: { backgroundColor: colors.coral, borderRadius: 28, gap: 8, padding: 25 }, heroLabel: { color: '#FFEAE2', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, heroNumber: { color: '#FFFFFF', fontSize: 52, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -2 }, heroRank: { alignSelf: 'flex-start', backgroundColor: 'rgba(32,31,32,.18)', borderRadius: 20, color: '#FFFFFF', fontSize: 12, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 6 }, heroMessage: { color: '#FFF4EE', fontSize: 15, fontWeight: '600', marginTop: 10 }, button: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 17, paddingVertical: 14 }, buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' }, muted: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
