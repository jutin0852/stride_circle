import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { Skeleton } from '@/components/skeleton';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { removeCircleMember, type CircleMember } from '@/lib/circles';
import { colors } from '@/theme';

export default function ManageMembersRoute() {
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details, status } = useCircleDetails(circleId);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function removeMember(memberId: string) {
    if (!details) return;
    setRemovingId(memberId);
    try {
      await removeCircleMember({ circleId: details.circle.id, memberId });
    } catch (error) {
      Alert.alert('Could not remove member', getMessage(error));
    } finally {
      setRemovingId(null);
    }
  }

  function confirmRemove(memberId: string, displayName: string) {
    Alert.alert(`Remove ${displayName}?`, 'They will no longer see this circle or contribute new steps.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeMember(memberId) },
    ]);
  }

  if (status === 'loading') return <MembersSkeleton />;
  if (!details || details.circle.ownerId !== user?.uid) return <View style={styles.loading}><Text style={styles.muted}>Only the circle creator can manage members.</Text></View>;

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
    <View style={styles.nav}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}><Text style={styles.back}>‹</Text></Pressable></View>
    <Text style={styles.eyebrow}>CIRCLE SETTINGS</Text><Text style={styles.title}>Manage members</Text><Text style={styles.description}>Remove people when they are no longer part of this circle.</Text>
    <View style={styles.members}>{details.members.map((member) => <View key={member.userId} style={styles.member}><Avatar member={member} /><View style={styles.memberText}><Text style={styles.memberName}>{member.userId === user?.uid ? 'You' : member.displayName}</Text><Text style={styles.memberStatus}>{member.userId === details.circle.ownerId ? 'Circle creator' : 'Circle member'}</Text></View>{member.userId !== user?.uid ? <Pressable accessibilityRole="button" disabled={removingId !== null} onPress={() => confirmRemove(member.userId, member.displayName)} style={styles.remove}>{removingId === member.userId ? <ActivityIndicator color="#B42318" size="small" /> : <Text style={styles.removeText}>Remove</Text>}</Pressable> : null}</View>)}</View>
  </ScrollView>;
}

function Avatar({ member }: { member: CircleMember }) {
  const initials = member.displayName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <DicebearAvatar choice={{ seed: member.avatarSeed, style: member.avatarStyle }} fallback={initials || 'SC'} size={44} />;
}
function MembersSkeleton() { return <View style={styles.skeletonPage}><Skeleton style={{ height: 40, width: 40 }} /><Skeleton style={{ height: 12, marginTop: 26, width: 118 }} /><Skeleton style={{ height: 30, marginTop: 10, width: '68%' }} /><Skeleton style={{ height: 14, marginTop: 11, width: '88%' }} /><View style={styles.members}>{[0, 1, 2].map((item) => <View key={item} style={styles.member}><Skeleton style={{ borderRadius: 22, height: 44, width: 44 }} /><View style={styles.memberText}><Skeleton style={{ height: 14, width: '68%' }} /><Skeleton style={{ height: 11, marginTop: 7, width: '42%' }} /></View></View>)}</View></View>; }
function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 14, padding: 24, paddingBottom: 40 }, loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 24 }, skeletonPage: { backgroundColor: colors.background, flex: 1, padding: 24 }, nav: { flexDirection: 'row' }, backButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 }, back: { color: colors.ink, fontSize: 32, fontWeight: '300', lineHeight: 34 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -1 }, description: { color: colors.muted, fontSize: 14, lineHeight: 20 }, muted: { color: colors.muted, fontSize: 14, textAlign: 'center' }, members: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, marginTop: 24, overflow: 'hidden' }, member: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 72, paddingHorizontal: 15 }, memberText: { flex: 1, gap: 2, marginLeft: 11 }, memberName: { color: colors.ink, fontSize: 15, fontWeight: '700' }, memberStatus: { color: colors.muted, fontSize: 11, fontWeight: '600' }, remove: { alignItems: 'center', backgroundColor: '#FFF0EF', borderRadius: 10, justifyContent: 'center', minHeight: 34, minWidth: 67, paddingHorizontal: 10 }, removeText: { color: '#B42318', fontSize: 12, fontWeight: '800' },
});
