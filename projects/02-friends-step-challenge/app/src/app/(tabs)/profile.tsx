import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { friends } from '@/data/circle';
import { colors } from '@/theme';

const settings = [
  ['Step access', 'Connected', 'Manage'],
  ['Weekly recap', 'Sunday at 7:00 PM', 'Edit'],
  ['Privacy', 'Only your circle sees your steps', 'View'],
  ['Notifications', 'Daily leaderboard updates', 'Manage'],
];

export default function ProfileRoute() {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
    <Text style={styles.eyebrow}>YOUR PROFILE</Text><Text style={styles.title}>Jutin</Text>
    <View style={styles.profileCard}><Avatar friend={friends[1]} size={74} /><View style={styles.profileText}><Text style={styles.profileTitle}>Walking with friends</Text><Text style={styles.profileCaption}>5 active days this week</Text></View></View>
    <Text style={styles.sectionTitle}>Settings</Text>
    <View style={styles.settings}>{settings.map(([title, detail, action]) => <Pressable key={title} style={styles.setting} onPress={() => Alert.alert(title, 'This setting becomes live when we connect the app services.')}><View><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingDetail}>{detail}</Text></View><Text style={styles.settingAction}>{action}</Text></Pressable>)}</View>
    <Text style={styles.note}>Prototype v0.1 · Local demo data</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 }, profileCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, flexDirection: 'row', marginTop: 8, padding: 18 }, profileText: { gap: 4, marginLeft: 14 }, profileTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, profileCaption: { color: colors.muted, fontSize: 13 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 14 }, settings: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: 'hidden' }, setting: { alignItems: 'center', borderBottomColor: '#F1ECE5', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 69, paddingHorizontal: 16 }, settingTitle: { color: '#282526', fontSize: 15, fontWeight: '700' }, settingDetail: { color: '#8D827A', fontSize: 12, marginTop: 3 }, settingAction: { color: colors.coralDark, fontSize: 13, fontWeight: '800' }, note: { color: '#A49A92', fontSize: 12, marginTop: 12, textAlign: 'center' },
});
