import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-provider';
import { AppText, Button, IconButton, StateCard, Surface } from '@/components/ui';
import { formatCircleWalkTime, localDateKeyAfter, MAX_CIRCLE_WALK_DETAILS_LENGTH, MAX_CIRCLE_WALK_MEETUP_LENGTH, MAX_CIRCLE_WALK_TITLE_LENGTH, parseCircleWalkDateTime } from '@/domain/circle-walks';
import { useAppColors } from '@/design-system/use-app-theme';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { useCircleWalks } from '@/hooks/use-circle-walks';
import { cancelCircleWalkPlan, createCircleWalkPlan, setCircleWalkRsvp, watchCircleWalkRsvps, type CircleWalkPlan } from '@/data/firebase/circle-walk-repository';

export function CircleWalksScreen() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { user } = useAuth();
  const { details: circleDetails, status: circleStatus } = useCircleDetails(circleId);
  const memberIds = useMemo(() => (circleDetails?.members ?? []).map((item) => item.userId), [circleDetails?.members]);
  const plansState = useCircleWalks(circleId);
  const member = circleDetails?.members.find((item) => item.userId === user?.uid);
  const [title, setTitle] = useState('Circle walk');
  const [dateKey, setDateKey] = useState(() => localDateKeyAfter(1));
  const [time, setTime] = useState('09:00');
  const [meetupLabel, setMeetupLabel] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scheduleWalk() {
    if (!circleId || !member) return;
    const startsAt = parseCircleWalkDateTime(dateKey.trim(), time.trim());
    if (!startsAt) {
      setError('Enter a valid future date as YYYY-MM-DD and time as 24-hour HH:MM.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createCircleWalkPlan({
        circleId,
        createdBy: member.userId,
        createdByName: member.displayName,
        details,
        meetupLabel,
        startsAt,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        title,
      });
      setTitle('Circle walk');
      setDateKey(localDateKeyAfter(1));
      setTime('09:00');
      setMeetupLabel('');
      setDetails('');
    } catch {
      setError('The walk could not be scheduled. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (circleStatus === 'loading') return <View style={styles.loading}><AppText tone="secondary">Loading circle…</AppText></View>;
  if (circleStatus === 'error' || !circleDetails || !member) return <View style={styles.loading}><StateCard tone="error" title="Circle walks unavailable" description="You need to be a current member of this circle to view its plans." actionLabel="Back" onAction={() => router.back()} /></View>;

  return <ScrollView contentInsetAdjustmentBehavior="never" style={styles.page} contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
    <View style={styles.header}>
      <IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="arrow-back" size={21} /></IconButton>
      <View style={styles.headerCopy}><AppText accessibilityRole="header" variant="titleSmall">Walk together</AppText><AppText tone="secondary" variant="caption">{circleDetails.circle.name}</AppText></View>
      <View style={styles.headerSpacer} />
    </View>

    <Surface padding="lg" radius="lg" style={styles.form}>
      <AppText variant="titleSmall">Plan a circle walk</AppText>
      <AppText tone="secondary" variant="bodySmall">Pick a time and share a familiar meeting point so your circle can join.</AppText>
      <Field label="Walk name"><TextInput accessibilityLabel="Walk name" maxLength={MAX_CIRCLE_WALK_TITLE_LENGTH} onChangeText={setTitle} placeholder="Circle walk" placeholderTextColor={colors.muted} style={styles.input} value={title} /></Field>
      <View style={styles.row}>
        <Field label="Date · YYYY-MM-DD" style={styles.flex}><TextInput accessibilityLabel="Walk date, year month day" maxLength={10} onChangeText={setDateKey} placeholder="2026-10-10" placeholderTextColor={colors.muted} style={styles.input} value={dateKey} /></Field>
        <Field label="Time · 24-hour" style={styles.timeField}><TextInput accessibilityLabel="Walk start time, 24 hour" keyboardType="numbers-and-punctuation" maxLength={5} onChangeText={setTime} placeholder="09:00" placeholderTextColor={colors.muted} style={styles.input} value={time} /></Field>
      </View>
      <Field label="Meetup landmark or area · optional"><TextInput accessibilityLabel="Approximate meetup landmark or area" maxLength={MAX_CIRCLE_WALK_MEETUP_LENGTH} onChangeText={setMeetupLabel} placeholder="e.g. the park entrance" placeholderTextColor={colors.muted} style={styles.input} value={meetupLabel} /></Field>
      <Field label="Details · optional"><TextInput accessibilityLabel="Walk details" maxLength={MAX_CIRCLE_WALK_DETAILS_LENGTH} multiline onChangeText={setDetails} placeholder="Pace, distance, or what to bring" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} textAlignVertical="top" value={details} /></Field>
      <AppText tone="secondary" variant="caption">Use a public landmark or general area, not a home address. The plan is visible only to circle members.</AppText>
      {error ? <AppText accessibilityRole="alert" tone="danger" variant="bodySmall">{error}</AppText> : null}
      <Button loading={saving} disabled={saving || !title.trim()} onPress={() => void scheduleWalk()}>Schedule walk</Button>
    </Surface>

    <View style={styles.sectionTitle}><AppText accessibilityRole="header" variant="titleSmall">Upcoming walks</AppText><AppText tone="secondary" variant="caption">{plansState.plans.length}</AppText></View>
    {plansState.status === 'loading' ? <Surface padding="lg" radius="lg"><AppText tone="secondary">Loading walk plans…</AppText></Surface> : plansState.status === 'error' ? <StateCard tone="error" title="Walk plans unavailable" description="We could not load upcoming walks." actionLabel="Try again" onAction={plansState.refresh} /> : plansState.plans.length === 0 ? <StateCard title="No walks planned yet" description="Create the first plan and invite your circle to walk together." /> : plansState.plans.map((plan) => <CircleWalkCard key={plan.id} circleId={circleId!} plan={plan} userId={member.userId} memberIds={memberIds} displayName={member.displayName} canCancel={plan.createdBy === member.userId || circleDetails.circle.ownerId === member.userId} />)}
  </ScrollView>;
}

function Field({ children, label, style }: { children: ReactNode; label: string; style?: object }) {
  const styles = useStyles();
  return <View style={[styles.field, style]}><AppText variant="label">{label}</AppText>{children}</View>;
}

function CircleWalkCard({ circleId, plan, userId, memberIds, displayName, canCancel }: { circleId: string; plan: CircleWalkPlan; userId: string; memberIds: readonly string[]; displayName: string; canCancel: boolean }) {
  const colors = useAppColors();
  const styles = useStyles();
  const [going, setGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const [rsvpStatus, setRsvpStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);

  // A plan card subscribes only to this member's RSVP; it never reads health or location data.
  const [retry, setRetry] = useState(0);
  useEffect(() => watchCircleWalkRsvps(circleId, plan.id, userId, memberIds, (summary) => { setGoing(summary.going); setGoingCount(summary.count); setRsvpStatus('ready'); }, () => setRsvpStatus('error')), [circleId, memberIds, plan.id, retry, userId]);

  async function toggleRsvp() {
    setBusy(true);
    try {
      await setCircleWalkRsvp({ circleId, walkId: plan.id, userId, displayName, going: !going });
    } catch {
      setRsvpStatus('error');
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    Alert.alert('Cancel this walk?', `“${plan.title}” will be removed from upcoming plans.`, [
      { text: 'Keep walk', style: 'cancel' },
      { text: 'Cancel walk', style: 'destructive', onPress: () => { void cancelCircleWalkPlan(circleId, plan.id).catch(() => setRsvpStatus('error')); } },
    ]);
  }

  return <Surface padding="lg" radius="lg" style={styles.walkCard}>
    <View style={styles.walkHeader}><View style={styles.walkIcon}><Ionicons color={colors.accentPressed} name="walk-outline" size={20} /></View><View style={styles.walkTitleCopy}><AppText variant="label">{plan.title}</AppText><AppText tone="secondary" variant="caption">{formatCircleWalkTime(plan.startsAt, plan.timeZone)} · planned by {plan.createdByName}</AppText></View>{canCancel ? <IconButton accessibilityLabel={`Cancel ${plan.title}`} onPress={cancel}><Ionicons color={colors.muted} name="ellipsis-horizontal" size={20} /></IconButton> : null}</View>
    {plan.meetupLabel ? <AppText variant="bodySmall">Meet at {plan.meetupLabel}</AppText> : null}
    {plan.details ? <AppText tone="secondary" variant="bodySmall">{plan.details}</AppText> : null}
    <View style={styles.rsvpRow}><AppText tone="secondary" variant="caption">{rsvpStatus === 'error' ? 'RSVP status unavailable' : `${goingCount} ${goingCount === 1 ? 'walker' : 'walkers'} going${going ? ' · you’re in' : ''}`}</AppText>{rsvpStatus === 'error' ? <Pressable accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}><AppText style={styles.retry}>Retry</AppText></Pressable> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || rsvpStatus !== 'ready', selected: going }} disabled={busy || rsvpStatus !== 'ready'} onPress={() => void toggleRsvp()} style={({ pressed }) => [styles.rsvpButton, going && styles.rsvpActive, (busy || rsvpStatus !== 'ready') && styles.disabled, pressed && styles.pressed]}><AppText variant="label" style={[styles.rsvpText, going && styles.rsvpActiveText]}>{rsvpStatus === 'loading' ? 'Loading…' : going ? 'Cancel RSVP' : 'I’m in'}</AppText></Pressable>}</View>
  </Surface>;
}

function useStyles() {
  const colors = useAppColors();
  return useMemo(() => createStyles(colors), [colors]);
}

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    page: { backgroundColor: colors.background, flex: 1 },
    content: { gap: 16, paddingHorizontal: 20 },
    loading: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    headerCopy: { flex: 1, gap: 2 },
    headerSpacer: { height: 44, width: 44 },
    form: { gap: 14 },
    field: { gap: 6 },
    input: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 48, paddingHorizontal: 12 },
    multiline: { minHeight: 78, paddingTop: 12 },
    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    timeField: { width: 118 },
    sectionTitle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    walkCard: { gap: 12 },
    walkHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    walkIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
    walkTitleCopy: { flex: 1, gap: 3 },
    rsvpRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
    rsvpButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 11, justifyContent: 'center', minHeight: 40, minWidth: 106, paddingHorizontal: 14 },
    rsvpActive: { backgroundColor: colors.soft, borderColor: colors.accent, borderWidth: 1 },
    rsvpText: { color: colors.onAccent },
    rsvpActiveText: { color: colors.accentPressed },
    retry: { color: colors.accentPressed, fontWeight: '800' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.75 },
  });
}
