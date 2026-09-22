import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { friends } from '@/data/circle';
import { colors } from '@/theme';

export default function CircleRoute() {
  const [linkCopied, setLinkCopied] = useState(false);

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
    <Text style={styles.eyebrow}>YOUR CIRCLE</Text>
    <Text style={styles.title}>Weekend Walkers</Text>
    <Text style={styles.description}>A private space to make ordinary walks more fun.</Text>
    <View style={styles.card}><Text selectable style={styles.total}>38,215</Text><Text style={styles.totalLabel}>steps together today</Text><View style={styles.stack}>{friends.slice(0, 5).map((friend, index) => <View key={friend.name} style={[styles.stackItem, { left: index * 29, zIndex: 5 - index }]}><Avatar friend={friend} size={40} /></View>)}</View></View>
    <Pressable style={[styles.invite, linkCopied && styles.inviteDone]} onPress={() => setLinkCopied(true)}><Text style={styles.inviteText}>{linkCopied ? 'Invite link copied' : 'Invite a friend'}</Text><Text style={styles.inviteText}>{linkCopied ? '✓' : '→'}</Text></Pressable>
    {linkCopied && <Text style={styles.hint}>Send the private circle link on WhatsApp or wherever your friends chat.</Text>}
    <Text style={styles.sectionTitle}>Members</Text>
    <View style={styles.members}>{friends.map(friend => <View key={friend.name} style={styles.member}><Avatar friend={friend} /><View style={styles.memberText}><Text style={styles.memberName}>{friend.name}</Text><Text style={styles.memberStatus}>{friend.isYou ? 'You are here' : 'Active today'}</Text></View></View>)}</View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 36 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 }, description: { color: '#716762', fontSize: 16, lineHeight: 23, maxWidth: 290 }, card: { backgroundColor: colors.navy, borderRadius: 25, gap: 4, padding: 23 }, total: { color: '#FFFFFF', fontSize: 38, fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: -1.3 }, totalLabel: { color: '#D8DAFB', fontSize: 14, fontWeight: '600' }, stack: { height: 42, marginTop: 18 }, stackItem: { position: 'absolute', top: 0 }, invite: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 17, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 19, paddingVertical: 16 }, inviteDone: { backgroundColor: colors.teal }, inviteText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, hint: { color: colors.muted, fontSize: 13, lineHeight: 18 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 14 }, members: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: 'hidden' }, member: { alignItems: 'center', borderBottomColor: '#F1ECE5', borderBottomWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: 15 }, memberText: { gap: 2, marginLeft: 11 }, memberName: { color: colors.ink, fontSize: 15, fontWeight: '700' }, memberStatus: { color: '#9B8E84', fontSize: 11, fontWeight: '600' },
});
