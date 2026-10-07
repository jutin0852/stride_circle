import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/auth-provider';
import { Skeleton } from '@/components/skeleton';
import { AppText } from '@/components/ui';
import { useCurrentCircle } from '@/hooks/use-current-circle';
import { createCircle, joinCircle, joinPublicCircle, type CircleActivityType, type CircleSummary, type PublicCircleSummary, watchPublicCircles } from '@/lib/circles';
import { MAX_CIRCLE_MEMBERS, type CircleVisibility } from '@/domain/circles';
import { colors } from '@/theme';

const AVATAR_COLORS = [colors.accent, colors.accentPressed, colors.success, '#62C9EB', '#317F1B', '#F77768'];

export default function CirclesRoute() {
  const { user } = useAuth();
  const { circles, status } = useCurrentCircle(user?.uid);
  const [publicCircles, setPublicCircles] = useState<PublicCircleSummary[]>([]);
  const [publicCircleStatus, setPublicCircleStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showSetup, setShowSetup] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const activityType: CircleActivityType = 'walk';
  const [visibility, setVisibility] = useState<CircleVisibility>('private');
  const [discoverableArea, setDiscoverableArea] = useState('');
  const [circleName, setCircleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => watchPublicCircles(
    (nextCircles) => {
      setPublicCircles(nextCircles);
      setPublicCircleStatus('ready');
    },
    () => setPublicCircleStatus('error'),
  ), []);

  async function handleCreate() {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const circleId = await createCircle({ activityType, discoverableArea, name: circleName, user, visibility });
      setCircleName('');
      setDiscoverableArea('');
      setShowSetup(false);
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
    } catch (error) {
      Alert.alert('Could not create circle', getMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinPublic(circleId: string) {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await joinPublicCircle({ circleId, user });
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
    } catch (error) {
      Alert.alert('Could not join public circle', getMessage(error));
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
          <AppText style={styles.eyebrow}>COMMUNITY</AppText>
          <AppText style={styles.title}>Circles</AppText>
        </View>
        {circles.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setShowSetup(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Ionicons color={colors.accentPressed} name="add" size={18} /><AppText style={styles.addButtonText}>Add</AppText>
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

      <View style={styles.discoverySection}>
        <View>
          <AppText style={styles.sectionEyebrow}>DISCOVER</AppText>
          <AppText style={styles.sectionTitle}>Public circles</AppText>
        </View>
        {publicCircleStatus === 'loading' ? <CircleListSkeleton /> : publicCircleStatus === 'error' ? <AppText style={styles.discoveryMessage}>Public circles are unavailable right now.</AppText> : publicCircles.length === 0 ? <AppText style={styles.discoveryMessage}>No public circles are available yet.</AppText> : <View style={styles.list}>{publicCircles.map((circle, index) => <PublicCircleRow circle={circle} disabled={isSubmitting || circles.some((owned) => owned.id === circle.id)} index={index} key={circle.id} onJoin={() => void handleJoinPublic(circle.id)} />)}</View>}
      </View>

      {showSetup ? (
        <SetupCard
          circleName={circleName}
          discoverableArea={discoverableArea}
          inviteCode={inviteCode}
          isSubmitting={isSubmitting}
          mode={mode}
          onCircleNameChange={setCircleName}
          onClose={() => setShowSetup(false)}
          onCreate={handleCreate}
          onDiscoverableAreaChange={setDiscoverableArea}
          onInviteCodeChange={setInviteCode}
          onJoin={handleJoin}
          onModeChange={setMode}
          onVisibilityChange={setVisibility}
          visibility={visibility}
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
        <AppText numberOfLines={1} style={styles.rowTitle}>{circle.name}</AppText>
        <AppText style={styles.rowSubtitle}>Walking circle</AppText>
      </View>
      <Ionicons color={colors.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}

function PublicCircleRow({ circle, disabled, index, onJoin }: { circle: PublicCircleSummary; disabled: boolean; index: number; onJoin: () => void }) {
  return <View style={styles.publicRow}><CircleAvatar circle={circle} index={index} /><View style={styles.rowText}><AppText numberOfLines={1} style={styles.rowTitle}>{circle.name}</AppText><AppText style={styles.rowSubtitle}>{circle.memberCount}/{MAX_CIRCLE_MEMBERS} members · Walking{circle.discoverableArea ? ` · ${circle.discoverableArea}` : ''}</AppText></View><Pressable accessibilityRole="button" disabled={disabled || circle.memberCount >= MAX_CIRCLE_MEMBERS} onPress={onJoin} style={({ pressed }) => [styles.joinButton, (disabled || circle.memberCount >= MAX_CIRCLE_MEMBERS) && styles.joinButtonDisabled, pressed && !disabled && styles.pressed]}><AppText style={styles.joinButtonText}>{circle.memberCount >= MAX_CIRCLE_MEMBERS ? 'Full' : disabled ? 'Joined' : 'Join'}</AppText></Pressable></View>;
}

function CircleAvatar({ circle, index }: { circle: CircleSummary; index: number }) {
  const initials = circle.name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return (
    <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
      <AppText style={styles.avatarText}>{initials || 'SC'}</AppText>
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
      <AppText style={styles.emptyTitle}>{title}</AppText>
      <AppText style={styles.emptyDescription}>{description}</AppText>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
        <AppText style={styles.primaryActionText}>{buttonLabel}</AppText>
      </Pressable>
    </View>
  );
}

function SetupCard({
  circleName, discoverableArea, inviteCode, isSubmitting, mode, onCircleNameChange, onClose, onCreate, onDiscoverableAreaChange, onInviteCodeChange, onJoin, onModeChange, onVisibilityChange, visibility,
}: {
  circleName: string; discoverableArea: string; inviteCode: string; isSubmitting: boolean; mode: 'create' | 'join'; visibility: CircleVisibility;
  onCircleNameChange: (value: string) => void; onClose: () => void; onCreate: () => void; onDiscoverableAreaChange: (value: string) => void;
  onInviteCodeChange: (value: string) => void; onJoin: () => void; onModeChange: (mode: 'create' | 'join') => void; onVisibilityChange: (visibility: CircleVisibility) => void;
}) {
  return (
    <View style={styles.setup}>
      <View style={styles.setupHeader}><AppText style={styles.setupTitle}>{mode === 'create' ? 'Create a circle' : 'Join a circle'}</AppText><Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.close}><Ionicons color={colors.muted} name="close" size={23} /></Pressable></View>
      <View style={styles.segment}><Segment active={mode === 'create'} label="Create" onPress={() => onModeChange('create')} /><Segment active={mode === 'join'} label="Join" onPress={() => onModeChange('join')} /></View>
      {mode === 'create' ? <>
        <AppText style={styles.fieldLabel}>CIRCLE TYPE</AppText>
        <AppText style={styles.hint}>Walking circles use your daily health-data step total.</AppText>
        <AppText style={styles.fieldLabel}>CIRCLE NAME</AppText>
        <TextInput accessibilityLabel="Circle name" autoCapitalize="words" maxLength={40} onChangeText={onCircleNameChange} placeholder="e.g. Saturday Walkers" placeholderTextColor={colors.muted} style={styles.input} value={circleName} />
        <AppText style={styles.fieldLabel}>VISIBILITY</AppText>
        <View style={styles.segment}><Segment active={visibility === 'private'} label="Private" onPress={() => onVisibilityChange('private')} /><Segment active={visibility === 'public'} label="Public" onPress={() => onVisibilityChange('public')} /></View>
        {visibility === 'public' ? <><AppText style={styles.fieldLabel}>DISCOVERY AREA</AppText><TextInput accessibilityLabel="Discovery area" autoCapitalize="words" maxLength={60} onChangeText={onDiscoverableAreaChange} placeholder="e.g. Yaba or Ikeja" placeholderTextColor={colors.muted} style={styles.input} value={discoverableArea} /><AppText style={styles.hint}>Use a city or broad neighborhood only. Never enter a home address.</AppText></> : null}
        <AppText style={styles.hint}>{visibility === 'private' ? 'Only people with your invite code can join.' : `Anyone can discover and join. Circles are limited to ${MAX_CIRCLE_MEMBERS} members.`}</AppText>
        <ActionButton disabled={isSubmitting} label="Create walking circle" onPress={onCreate} />
      </> : <>
        <AppText style={styles.fieldLabel}>INVITE CODE</AppText>
        <TextInput accessibilityLabel="Circle invite code" autoCapitalize="characters" autoCorrect={false} maxLength={8} onChangeText={onInviteCodeChange} placeholder="ABCDEFGH" placeholderTextColor={colors.muted} style={[styles.input, styles.codeInput]} value={inviteCode} />
        <AppText style={styles.hint}>Ask the circle creator to share their private code.</AppText>
        <ActionButton disabled={isSubmitting} label="Join circle" onPress={onJoin} />
      </>}
    </View>
  );
}

function Segment({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}><AppText style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</AppText></Pressable>;
}

function ActionButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryAction, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>{disabled ? <ActivityIndicator color={colors.accentText} /> : <AppText style={styles.primaryActionText}>{label}</AppText>}</Pressable>;
}

function getMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

const styles = StyleSheet.create({
  page: { backgroundColor: colors.background }, content: { gap: 16, padding: 24, paddingBottom: 36 }, header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.2 },
  addButton: { alignItems: 'center', backgroundColor: colors.soft, borderBottomWidth: 3, borderColor: colors.border, borderRadius: 13, borderWidth: 2, flexDirection: 'row', gap: 3, paddingHorizontal: 12, paddingVertical: 9 }, addButtonText: { color: colors.accentPressed, fontSize: 13, fontWeight: '800' },
  loading: { alignItems: 'center', minHeight: 180, justifyContent: 'center' }, list: { backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, paddingHorizontal: 15 }, publicRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, paddingHorizontal: 15 }, skeletonRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 78, paddingHorizontal: 15 }, skeletonAvatar: { borderRadius: 24, height: 48, width: 48 }, skeletonCopy: { flex: 1, marginLeft: 12 }, rowPressed: { backgroundColor: colors.soft },
  avatar: { alignItems: 'center', borderRadius: 24, height: 48, justifyContent: 'center', width: 48 }, avatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  rowText: { flex: 1, gap: 3, marginLeft: 12 }, rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, rowSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  discoverySection: { gap: 10, marginTop: 12 }, sectionEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, sectionTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' }, discoveryMessage: { color: colors.muted, fontSize: 13, lineHeight: 19 }, joinButton: { alignItems: 'center', backgroundColor: colors.accent, borderBottomWidth: 3, borderColor: colors.accentBorder, borderRadius: 11, borderWidth: 2, minWidth: 58, paddingHorizontal: 11, paddingVertical: 8 }, joinButtonDisabled: { backgroundColor: colors.soft, borderColor: colors.border }, joinButtonText: { color: colors.accentText, fontSize: 12, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 24, borderWidth: 2, gap: 10, padding: 27 }, emptyIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 27, height: 54, justifyContent: 'center', width: 54 }, emptyTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' }, emptyDescription: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  setup: { backgroundColor: colors.card, borderBottomWidth: 4, borderColor: colors.border, borderRadius: 22, borderWidth: 2, gap: 12, padding: 18 }, setupHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, setupTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, close: { alignItems: 'center', height: 32, justifyContent: 'center', width: 32 },
  segment: { backgroundColor: colors.soft, borderRadius: 14, flexDirection: 'row', padding: 4 }, segmentButton: { alignItems: 'center', borderRadius: 11, flex: 1, paddingVertical: 10 }, segmentButtonActive: { backgroundColor: colors.card }, segmentText: { color: colors.muted, fontSize: 13, fontWeight: '800' }, segmentTextActive: { color: colors.ink },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }, input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 16, minHeight: 51, paddingHorizontal: 14 }, codeInput: { fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 2, textAlign: 'center' }, hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  primaryAction: { alignItems: 'center', backgroundColor: colors.accent, borderBottomWidth: 4, borderColor: colors.accentBorder, borderRadius: 14, borderWidth: 2, justifyContent: 'center', minHeight: 51, paddingHorizontal: 16 }, primaryActionText: { color: colors.accentText, fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.6 }, pressed: { borderBottomWidth: 2, opacity: 0.84, transform: [{ translateY: 2 }] },
});
