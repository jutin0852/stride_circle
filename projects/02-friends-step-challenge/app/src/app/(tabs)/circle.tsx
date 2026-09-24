import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/auth-provider';
import { Skeleton } from '@/components/skeleton';
import { useCurrentCircle } from '@/hooks/use-current-circle';
import { createCircle, joinCircle, type CircleActivityType, type CircleSummary } from '@/lib/circles';
import { colors } from '@/theme';

const AVATAR_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#1D4ED8', '#0EA5E9', '#6366F1'];

export default function CirclesRoute() {
  const { user } = useAuth();
  const { circles, status } = useCurrentCircle(user?.uid);
  const [showSetup, setShowSetup] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [activityType, setActivityType] = useState<CircleActivityType>('walk');
  const [circleName, setCircleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const circleId = await createCircle({ activityType, name: circleName, user });
      setCircleName('');
      setShowSetup(false);
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
    } catch (error) {
      Alert.alert('Could not create circle', getMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin() {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const circleId = inviteCode.trim().toUpperCase().replace(/\s/g, '');
      await joinCircle({ inviteCode, user });
      setInviteCode('');
      setShowSetup(false);
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
    } catch (error) {
      Alert.alert('Could not join circle', getMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>COMMUNITY</Text>
          <Text style={styles.title}>Circles</Text>
        </View>
        {circles.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setShowSetup(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Ionicons color={colors.accentPressed} name="add" size={18} /><Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {status === 'loading' ? (
        <CircleListSkeleton />
      ) : status === 'error' ? (
        <EmptyState title="Could not load your circles" description="Check your connection and try reopening this tab." onPress={() => setShowSetup(true)} buttonLabel="Create or join" />
      ) : circles.length === 0 ? (
        <EmptyState title="No circles yet" description="Create one for friends, or join one with a private invite code." onPress={() => setShowSetup(true)} buttonLabel="Create or join a circle" />
      ) : (
        <View style={styles.list}>
          {circles.map((circle, index) => <CircleRow circle={circle} index={index} key={circle.id} />)}
        </View>
      )}

      {showSetup ? (
        <SetupCard
          activityType={activityType}
          circleName={circleName}
          inviteCode={inviteCode}
          isSubmitting={isSubmitting}
          mode={mode}
          onActivityTypeChange={setActivityType}
          onCircleNameChange={setCircleName}
          onClose={() => setShowSetup(false)}
          onCreate={handleCreate}
          onInviteCodeChange={setInviteCode}
          onJoin={handleJoin}
          onModeChange={setMode}
        />
      ) : null}
    </ScrollView>
  );
}

function CircleRow({ circle, index }: { circle: CircleSummary; index: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${circle.name}`}
      onPress={() => router.push({ pathname: '/circle/[circleId]', params: { circleId: circle.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <CircleAvatar circle={circle} index={index} />
      <View style={styles.rowText}>
        <Text numberOfLines={1} style={styles.rowTitle}>{circle.name}</Text>
        <Text style={styles.rowSubtitle}>{circle.activityType === 'run' ? 'Running circle' : 'Walking circle'}</Text>
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function CircleAvatar({ circle, index }: { circle: CircleSummary; index: number }) {
  const initials = circle.name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
      <Text style={styles.avatarText}>{initials || 'SC'}</Text>
    </View>
  );
}

function CircleListSkeleton() {
  return <View style={styles.list}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow}><Skeleton style={styles.skeletonAvatar} /><View style={styles.skeletonCopy}><Skeleton style={{ height: 15, width: '68%' }} /><Skeleton style={{ height: 11, marginTop: 8, width: '42%' }} /></View><Skeleton style={{ height: 18, width: 18 }} /></View>)}</View>;
}

function EmptyState({ buttonLabel, description, onPress, title }: { buttonLabel: string; description: string; onPress: () => void; title: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons color={colors.accent} name="people-outline" size={27} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
        <Text style={styles.primaryActionText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function SetupCard({
  activityType, circleName, inviteCode, isSubmitting, mode, onActivityTypeChange, onCircleNameChange, onClose, onCreate, onInviteCodeChange, onJoin, onModeChange,
}: {
  activityType: CircleActivityType; circleName: string; inviteCode: string; isSubmitting: boolean; mode: 'create' | 'join';
  onActivityTypeChange: (type: CircleActivityType) => void; onCircleNameChange: (value: string) => void; onClose: () => void; onCreate: () => void;
  onInviteCodeChange: (value: string) => void; onJoin: () => void; onModeChange: (mode: 'create' | 'join') => void;
}) {
  return (
    <View style={styles.setup}>
      <View style={styles.setupHeader}><Text style={styles.setupTitle}>{mode === 'create' ? 'Create a circle' : 'Join a circle'}</Text><Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.close}><Ionicons color={colors.muted} name="close" size={23} /></Pressable></View>
      <View style={styles.segment}><Segment active={mode === 'create'} label="Create" onPress={() => onModeChange('create')} /><Segment active={mode === 'join'} label="Join" onPress={() => onModeChange('join')} /></View>
      {mode === 'create' ? <>
        <Text style={styles.fieldLabel}>ACTIVITY TYPE</Text>
        <View style={styles.segment}><Segment active={activityType === 'walk'} label="Walk" onPress={() => onActivityTypeChange('walk')} /><Segment active={activityType === 'run'} label="Run" onPress={() => onActivityTypeChange('run')} /></View>
        <Text style={styles.fieldLabel}>CIRCLE NAME</Text>
        <TextInput accessibilityLabel="Circle name" autoCapitalize="words" maxLength={40} onChangeText={onCircleNameChange} placeholder={activityType === 'run' ? 'e.g. Saturday Runners' : 'e.g. Saturday Walkers'} placeholderTextColor={colors.muted} style={styles.input} value={circleName} />
        <Text style={styles.hint}>You will get a private eight-character invite code.</Text>
        <ActionButton disabled={isSubmitting} label={`Create ${activityType === 'run' ? 'running' : 'walking'} circle`} onPress={onCreate} />
      </> : <>
        <Text style={styles.fieldLabel}>INVITE CODE</Text>
        <TextInput accessibilityLabel="Circle invite code" autoCapitalize="characters" autoCorrect={false} maxLength={8} onChangeText={onInviteCodeChange} placeholder="ABCDEFGH" placeholderTextColor={colors.muted} style={[styles.input, styles.codeInput]} value={inviteCode} />
        <Text style={styles.hint}>Ask the circle creator to share their private code.</Text>
        <ActionButton disabled={isSubmitting} label="Join circle" onPress={onJoin} />
      </>}
    </View>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text></Pressable>;
}

function ActionButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primaryAction, disabled && styles.disabled]}>{disabled ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>{label}</Text>}</Pressable>;
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 16, padding: 24, paddingBottom: 36 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 },
  addButton: { alignItems: 'center', backgroundColor: '#EAF0FF', borderRadius: 13, flexDirection: 'row', gap: 3, paddingHorizontal: 12, paddingVertical: 10 }, addButtonText: { color: colors.accentPressed, fontSize: 13, fontWeight: '800' },
  loading: { alignItems: 'center', minHeight: 180, justifyContent: 'center' }, list: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, paddingHorizontal: 15 }, skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, paddingHorizontal: 15 }, skeletonAvatar: { borderRadius: 24, height: 48, width: 48 }, skeletonCopy: { flex: 1, marginLeft: 12 }, rowPressed: { backgroundColor: colors.soft },
  avatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 }, avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  rowText: { flex: 1, gap: 3, marginLeft: 12 }, rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, rowSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 24, borderWidth: 1, gap: 10, padding: 27 }, emptyIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 27, height: 54, justifyContent: 'center', width: 54 }, emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' }, emptyDescription: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  setup: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 22, borderWidth: 1, gap: 12, padding: 18 }, setupHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, setupTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, close: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
  segment: { backgroundColor: colors.soft, borderRadius: 14, flexDirection: 'row', padding: 4 }, segmentButton: { alignItems: 'center', borderRadius: 11, flex: 1, paddingVertical: 10 }, segmentButtonActive: { backgroundColor: colors.card }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '800' }, segmentTextActive: { color: colors.ink },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 51, paddingHorizontal: 14 }, codeInput: { fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 2, textAlign: 'center' }, hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  primaryAction: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, justifyContent: 'center', minHeight: 51, paddingHorizontal: 16 }, primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.6 }, pressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
});
