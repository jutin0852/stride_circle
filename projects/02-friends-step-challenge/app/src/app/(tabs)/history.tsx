import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Leaderboard } from '@/components/leaderboard';
import { formatSteps, week } from '@/data/circle';
import { colors } from '@/theme';

export default function HistoryRoute() {
  const [selectedDay, setSelectedDay] = useState(4);
  const day = week[selectedDay];
  const yourRank = day.standings.findIndex(friend => friend.isYou) + 1;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
    <Text style={styles.eyebrow}>YOUR PROGRESS</Text>
    <Text style={styles.title}>This week</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
      {week.map((item, index) => <Pressable key={item.date} onPress={() => setSelectedDay(index)} style={[styles.day, index === selectedDay && styles.dayActive]}><Text style={[styles.dayText, index === selectedDay && styles.dayTextActive]}>{item.label}</Text><Text style={[styles.dateText, index === selectedDay && styles.dayTextActive]}>{item.date.split(' ')[1]}</Text>{item.winner === 'You' && <Text style={styles.crown}>♛</Text>}</Pressable>)}
    </ScrollView>
    <View style={styles.summary}><Text style={styles.eyebrow}>{day.label.toUpperCase()}, {day.date.toUpperCase()}</Text><Text selectable style={styles.summarySteps}>{formatSteps(day.standings.find(friend => friend.isYou)?.steps ?? 0)} steps</Text><Text style={styles.summaryText}>You finished #{yourRank}. {day.winner === 'You' ? 'You won the day.' : `${day.winner} led the circle.`}</Text></View>
    <Text style={styles.sectionTitle}>Saved standings</Text>
    <Leaderboard friends={day.standings} />
    <Text style={styles.sectionTitle}>Your week so far</Text>
    <View style={styles.metrics}><Metric value="34,884" label="TOTAL STEPS" /><Metric value="9,124" label="BEST DAY" /><Metric value="5" label="ACTIVE DAYS" /><Metric value="2" label="DAYS WON" /></View>
  </ScrollView>;
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text selectable style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 }, days: { gap: 9, paddingVertical: 5 }, day: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 17, height: 65, justifyContent: 'center', minWidth: 60, paddingHorizontal: 15 }, dayActive: { backgroundColor: colors.ink }, dayText: { color: '#6D635D', fontSize: 12, fontWeight: '800' }, dateText: { color: '#9A8F86', fontSize: 11, marginTop: 2 }, dayTextActive: { color: '#FFFFFF' }, crown: { color: '#E49A2B', fontSize: 11, position: 'absolute', right: 5, top: 3 }, summary: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 7, padding: 21 }, summarySteps: { color: colors.ink, fontSize: 29, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -1 }, summaryText: { color: '#726862', fontSize: 14, lineHeight: 20 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 10 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, metric: { backgroundColor: colors.soft, borderRadius: 17, gap: 5, padding: 16, width: '48.5%' }, metricValue: { color: colors.ink, fontSize: 21, fontVariant: ['tabular-nums'], fontWeight: '800' }, metricLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: .8 },
});
