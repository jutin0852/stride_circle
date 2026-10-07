import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { getPersonalProgress, type HomeHealthState } from './home-model';
import { homeColors, homeDarkColors, homeMotion } from './tokens';
import { useReducedHomeMotion } from './use-home-motion';
import { WalkingCompanion } from './walking-companion';

export type HomeStanding = { userId: string; name: string; steps: number | null; rank: number | null; self: boolean };
export type HomeCircle = { id: string; name: string; memberCount: number; rank: number | null; deadline: string; timeZone: string; standings: HomeStanding[]; scoreStatus: 'loading' | 'ready' | 'error' };
export type HomeViewProps = {
  greeting: string; streak: number | null; steps: number | null; goal: number | null; health: HomeHealthState;
  circle: HomeCircle | null; circleStatus: 'loading' | 'ready' | 'error'; circles: { id: string; name: string }[];
  goalEvent: number; source: string; healthBusy: boolean; connectionError: string | null;
  onProfile: () => void; onGoal: () => void; onCircles: () => void; onCircle: () => void; onHistory: () => void;
  onWalk?: () => void;
  onSelectCircle: (id: string) => Promise<void>; onConnect: () => Promise<void>; onHealthSettings: () => Promise<void>; onRetryCircle: () => void;
  social: { name: string; steps: number; status: 'loading' | 'idle' | 'sending' | 'sent' | 'error'; onCheer: () => Promise<void> } | null;
};

type HomeTheme = Record<keyof typeof homeColors, string>;
function Copy({ children, colors, style, ...props }: React.ComponentProps<typeof AppText> & { colors: HomeTheme }) {
  return <AppText {...props} style={[styles.copy, { color: colors.ink }, style]}>{children}</AppText>;
}

function Action({ children, onPress, label, disabled, busy, colors, secondary = false }: {
  children: React.ReactNode; onPress: () => void; label?: string; disabled?: boolean; busy?: boolean; colors: HomeTheme; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.action, { backgroundColor: secondary ? colors.canvas : colors.blue, borderColor: secondary ? colors.line : '#087CA5', borderBottomWidth: pressed ? 2 : 5, transform: [{ translateY: pressed ? 2 : 0 }], opacity: disabled ? 0.55 : 1 }]}>
    {busy ? <ActivityIndicator color={colors.ink} /> : <Copy colors={colors} style={[styles.actionLabel, !secondary && { color: '#102F3C' }]}>{children}</Copy>}
  </Pressable>;
}

function Progress({ steps, goal, health, colors, reduced, onGoal }: { steps: number | null; goal: number | null; health: HomeHealthState; colors: HomeTheme; reduced: boolean; onGoal: () => void }) {
  const progress = getPersonalProgress(steps, goal ?? 0);
  const [value] = useState(() => new Animated.Value(steps ?? 0));
  const [display, setDisplay] = useState(steps ?? 0);
  const previous = useRef<number | null>(null);
  useEffect(() => {
    const listener = value.addListener(({ value: next }) => setDisplay(Math.round(next)));
    return () => value.removeListener(listener);
  }, [value]);
  useEffect(() => {
    value.stopAnimation();
    if (steps === null || previous.current === null || reduced || health !== 'confirmed') value.setValue(steps ?? 0);
    else Animated.timing(value, { toValue: steps, duration: homeMotion.progress, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    previous.current = steps;
    return () => value.stopAnimation();
  }, [health, reduced, steps, value]);
  const percent = steps !== null && goal !== null ? Math.min(100, Math.floor(display / goal * 100)) : null;
  const reached = health === 'confirmed' && progress.goalMet;
  return <>
    <Copy colors={colors} style={styles.label}>Today’s steps</Copy>
    <Copy colors={colors} style={styles.count} accessible={false}>{steps === null ? '—' : display.toLocaleString()}</Copy>
    <Pressable accessibilityRole="button" accessibilityLabel={goal === null ? 'Set your daily goal' : `Daily goal: ${goal.toLocaleString()} steps. Change your goal`} onPress={onGoal} style={styles.goalLink}>
      <Copy colors={colors} style={{ color: colors.muted, fontSize: 14 }}>{goal === null ? 'Daily goal unavailable' : `/ ${goal.toLocaleString()} daily goal`}</Copy>
      <Ionicons name="chevron-forward" color={colors.muted} size={14} />
    </Pressable>
    <View style={styles.progressRow} accessibilityRole="progressbar" accessibilityLabel="Today’s walking progress" accessibilityValue={progress.percent === null ? { text: 'Total unavailable' } : { min: 0, max: 100, now: progress.percent, text: `${steps?.toLocaleString()} steps, ${progress.percent}% of daily goal` }}>
      <View style={styles.ring} accessible={false}>
        <Svg width={64} height={64} viewBox="0 0 64 64">
          <Circle cx={32} cy={32} r={27} stroke={colors.panelLine} strokeWidth={6} fill="none" />
          <Circle cx={32} cy={32} r={27} stroke={reached ? colors.green : colors.blue} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 27}`} strokeDashoffset={2 * Math.PI * 27 * (1 - (percent ?? 0) / 100)} rotation={-90} origin="32, 32" fill="none" />
        </Svg>
        <Copy colors={colors} style={styles.ringLabel}>{percent === null ? '—' : `${percent}%`}</Copy>
      </View>
      <View style={styles.fill}>
        <Copy colors={colors} style={styles.remaining}>{health === 'stale' ? 'Last confirmed total' : steps === null ? health === 'loading' ? 'Your walking day is loading' : 'Today’s total is unavailable' : goal === null ? 'Set a goal that works for you' : steps === 0 ? 'A few steps is a lovely start.' : progress.goalMet ? `${(steps - goal).toLocaleString()} steps beyond your goal` : `${progress.remaining?.toLocaleString()} steps to your goal`}</Copy>
        {reached ? <Copy colors={colors} accessibilityLiveRegion="polite" style={{ color: colors.green, fontWeight: '800', marginTop: 4 }}>Goal reached</Copy> : null}
      </View>
    </View>
  </>;
}

function Companion({ goalEvent, happy, helpful, reduced, colors, size }: { goalEvent: number; happy: boolean; helpful: boolean; reduced: boolean; colors: HomeTheme; size: number }) {
  const [hop] = useState(() => new Animated.Value(0));
  const [burst] = useState(() => new Animated.Value(0));
  const played = useRef(0);
  const greeted = useRef(false);
  useEffect(() => {
    if (reduced || greeted.current) return;
    greeted.current = true;
    Animated.sequence([Animated.timing(hop, { toValue: 0.3, duration: 240, useNativeDriver: true }), Animated.timing(hop, { toValue: 0, duration: 360, useNativeDriver: true })]).start();
    return () => { hop.stopAnimation(); hop.setValue(0); };
  }, [hop, reduced]);
  useEffect(() => {
    hop.stopAnimation(); burst.stopAnimation(); hop.setValue(0); burst.setValue(0);
    if (!goalEvent || goalEvent === played.current) return;
    played.current = goalEvent;
    if (reduced || !happy) return;
    const animation = Animated.parallel([
      Animated.sequence([Animated.timing(hop, { toValue: 1, duration: 240, useNativeDriver: true }), Animated.spring(hop, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(150), Animated.timing(burst, { toValue: 1, duration: 250, useNativeDriver: true }), Animated.timing(burst, { toValue: 0, duration: 500, useNativeDriver: true })]),
    ]);
    animation.start();
    return () => { animation.stop(); hop.setValue(0); burst.setValue(0); };
  }, [burst, goalEvent, happy, hop, reduced]);
  return <View accessible={false} style={{ width: size, height: size }}>
    <View style={[styles.shadow, { backgroundColor: colors.panelLine, width: size * 0.6, left: size * 0.2 }]} />
    <Animated.View style={{ transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-6deg'] }) }] }}>
      <WalkingCompanion size={size} happy={happy} helpful={helpful} shadow={false} />
    </Animated.View>
    {!reduced ? <Animated.View pointerEvents="none" style={[styles.sparkles, { opacity: burst }]}>{[colors.yellow, colors.coral, colors.blue].map((color, index) => <View key={color} style={{ position: 'absolute', backgroundColor: color, width: 6, height: 6, borderRadius: index === 1 ? 3 : 1, left: index * 30 - 4, top: index === 1 ? -8 : 16, transform: [{ rotate: '30deg' }] }} />)}</Animated.View> : null}
  </View>;
}

export function HomeView(props: HomeViewProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? homeDarkColors : homeColors;
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const narrow = width < 350 || fontScale > 1.3;
  const reduced = useReducedHomeMotion();
  const [sheet, setSheet] = useState<'health' | 'circles' | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [healthAction, setHealthAction] = useState(false);
  const [cheerScale] = useState(() => new Animated.Value(1));
  const [circleOpacity] = useState(() => new Animated.Value(1));
  const [sheetProgress] = useState(() => new Animated.Value(0));
  const previousCheer = useRef(props.social?.status);
  const previousCircle = useRef(props.circle?.id);
  useEffect(() => {
    const sentNow = previousCheer.current === 'sending' && props.social?.status === 'sent';
    previousCheer.current = props.social?.status;
    if (!sentNow || reduced) return;
    const animation = Animated.sequence([Animated.timing(cheerScale, { toValue: 1.07, duration: 140, useNativeDriver: true }), Animated.timing(cheerScale, { toValue: 1, duration: 280, useNativeDriver: true })]);
    animation.start();
    return () => { animation.stop(); cheerScale.setValue(1); };
  }, [cheerScale, props.social?.status, reduced]);
  useEffect(() => {
    if (previousCircle.current === props.circle?.id || reduced) return;
    previousCircle.current = props.circle?.id;
    circleOpacity.setValue(0.5);
    const animation = Animated.timing(circleOpacity, { toValue: 1, duration: homeMotion.circle, useNativeDriver: true });
    animation.start();
    return () => { animation.stop(); circleOpacity.setValue(1); };
  }, [circleOpacity, props.circle?.id, reduced]);
  useEffect(() => { if (props.goalEvent) AccessibilityInfo.announceForAccessibility('Daily walking goal reached. Nice work!'); }, [props.goalEvent]);
  useEffect(() => {
    sheetProgress.stopAnimation();
    sheetProgress.setValue(0);
    if (sheet === null) return;
    if (reduced) {
      sheetProgress.setValue(1);
      return;
    }
    const animation = Animated.timing(sheetProgress, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, sheet, sheetProgress]);
  const openSheet = (next: 'health' | 'circles') => { setSheetError(null); setSheet(next); };
  async function healthActionRun(action: () => Promise<void>) {
    if (healthAction) return;
    setHealthAction(true); setSheetError(null);
    try { await action(); } catch { setSheetError('Health access could not be opened. Please try again.'); }
    finally { setHealthAction(false); }
  }
  const goalMet = props.health === 'confirmed' && getPersonalProgress(props.steps, props.goal ?? 0).goalMet;
  const cardStyle = { backgroundColor: colors.canvas, borderColor: colors.line };
  return <View style={[styles.page, { backgroundColor: colors.canvas }]}>
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12) + 8, paddingHorizontal: narrow ? 16 : 20 }]}>
      <View style={[styles.header, narrow && styles.wrap]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your private profile and health settings" onPress={() => openSheet('health')} style={({ pressed }) => [styles.profile, { borderColor: colors.edge, backgroundColor: colors.ice, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="person-outline" color={colors.edge} size={22} />
        </Pressable>
        <View style={styles.fill}><Copy colors={colors} style={styles.greeting}>Hey, {props.greeting}!</Copy><Copy colors={colors} style={{ fontSize: 12, color: colors.muted }}>Let’s make today count.</Copy></View>
        <Pressable accessibilityRole="button" accessibilityLabel={props.streak === null ? 'Open your walking history' : `${props.streak}-day walking streak. Open history`} onPress={props.onHistory} style={styles.streak}>
          <Ionicons name="flame-outline" color={colors.coral} size={24} /><Copy colors={colors} style={styles.streakText}>{props.streak === null ? '—' : `${props.streak}-day streak`}</Copy>
        </Pressable>
      </View>
      <Copy accessibilityRole="header" colors={colors} style={styles.title}>Your walking day,{ '\n' }<AppText style={{ color: colors.edge, fontWeight: '800' }}>together.</AppText></Copy>
      <View style={[styles.hero, { backgroundColor: colors.ice, borderColor: colors.panelLine, padding: narrow ? 12 : 16 }]}>
        <View style={styles.progressCopy}>
          <Progress steps={props.steps} goal={props.goal} health={props.health} colors={colors} reduced={reduced} onGoal={props.onGoal} />
        </View>
        <View pointerEvents="none" style={styles.companion}>
          <Companion colors={colors} size={narrow ? 56 : 64} reduced={reduced} happy={goalMet} helpful={props.health === 'stale' || props.health === 'unavailable'} goalEvent={props.goalEvent} />
        </View>
      </View>
      {props.health === 'unavailable' || props.health === 'stale' ? <View style={[styles.notice, { backgroundColor: colors.panelEdge, borderColor: colors.line }]}>
        <Copy colors={colors} style={styles.remaining}>{props.health === 'stale' ? 'Today’s total may be incomplete' : 'Health access needs attention'}</Copy>
        <Pressable accessibilityRole="button" onPress={() => openSheet('health')} style={styles.textAction}><Copy colors={colors} style={{ color: colors.edge, fontWeight: '800' }}>{props.health === 'stale' ? 'Health connection details' : 'Connect health access'}</Copy><Ionicons name="arrow-forward" size={18} color={colors.edge} /></Pressable>
      </View> : null}
      <Animated.View style={{ opacity: circleOpacity }}>
        <View style={[styles.circleCard, cardStyle, { padding: narrow ? 12 : 16 }]}>
          <Copy colors={colors} style={[styles.eyebrow, { color: colors.muted }]}>YOUR FEATURED CIRCLE</Copy>
          {props.circleStatus === 'loading' ? <View style={styles.waiting}><ActivityIndicator color={colors.edge} /><Copy colors={colors}>Loading your circle…</Copy></View> : props.circleStatus === 'error' ? <View style={styles.empty}>
            <Copy colors={colors} style={styles.circleTitle}>Your circle couldn’t load</Copy><Copy colors={colors} style={{ color: colors.muted }}>Your personal progress is still here.</Copy><Action colors={colors} onPress={props.onRetryCircle}>Try again</Action>
          </View> : props.circle ? <>
            <View style={styles.circleHeader}>
              <View style={styles.fill}><Copy accessibilityRole="header" colors={colors} style={styles.circleTitle}>{props.circle.name}</Copy><Copy colors={colors} style={{ color: colors.muted, fontSize: 14 }}>{props.circle.memberCount} of 20 members</Copy></View>
              {props.circles.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel="Switch featured circle" onPress={() => openSheet('circles')} style={[styles.switcher, { borderColor: colors.line }]}><Ionicons color={colors.ink} size={20} name="chevron-down" /></Pressable> : null}
            </View>
            <View style={[styles.circleSummary, narrow && styles.column]}>
              <Copy colors={colors} style={[styles.remaining, { color: colors.edge }]}>{props.circle.rank === null ? 'Your rank is unavailable' : `You’re ${props.circle.rank === 1 ? 'first' : props.circle.rank === 2 ? 'second' : props.circle.rank === 3 ? 'third' : `${props.circle.rank}th`} today`}</Copy>
              <View style={styles.deadline}><Copy colors={colors} style={{ fontSize: 13, fontWeight: '700' }}>{props.circle.deadline}</Copy><Copy colors={colors} style={{ color: colors.muted, fontSize: 12 }}>{props.circle.timeZone}</Copy></View>
            </View>
            {props.circle.scoreStatus === 'error' ? <Copy colors={colors} style={{ color: colors.muted }}>Standings couldn’t load. Open your circle to try again.</Copy> : props.circle.scoreStatus === 'loading' ? <View style={styles.waiting}><ActivityIndicator color={colors.edge} /><Copy colors={colors}>Loading standings…</Copy></View> : props.circle.standings.length ? <View style={styles.standings}>{props.circle.standings.map((standing) => <View key={standing.userId} style={[styles.standing, { backgroundColor: standing.self ? colors.ice : colors.canvas, borderColor: standing.self ? colors.panelLine : 'transparent' }]}>
              <Copy colors={colors} style={[styles.rank, { color: colors.muted }]}>{standing.rank ?? '—'}</Copy>
              <Copy colors={colors} style={[styles.fill, styles.standingName]}>{standing.self ? 'You' : standing.name}</Copy>
              <Copy colors={colors} style={styles.standingSteps}>{standing.steps === null ? '—' : standing.steps.toLocaleString()}</Copy>
            </View>)}</View> : <Copy colors={colors} style={{ color: colors.muted }}>The first steps of the day are on their way.</Copy>}
            <Action colors={colors} onPress={props.onCircle}>View circle</Action>
          </> : <View style={styles.empty}>
            <Copy colors={colors} accessibilityRole="header" style={styles.circleTitle}>Your steps are better together</Copy>
            <Copy colors={colors} style={{ color: colors.muted }}>Walk with friends in a private circle, or discover a public one.</Copy>
            <Action colors={colors} onPress={props.onCircles}>Find your circle</Action>
          </View>}
        </View>
      </Animated.View>
      {props.social && props.circle ? <View style={[styles.social, cardStyle, narrow && styles.column]}>
        <View style={styles.fill}><Copy colors={colors} style={styles.remaining}>{props.social.name} is making strides</Copy><Copy colors={colors} style={{ color: colors.muted, fontSize: 13 }}>{props.social.steps.toLocaleString()} steps · {props.circle.name}</Copy>
          {props.social.status === 'error' ? <Copy colors={colors} accessibilityRole="alert" style={{ color: colors.coral, fontSize: 13 }}>Cheer couldn’t send. Try again.</Copy> : null}
        </View>
        <Animated.View style={{ transform: [{ scale: cheerScale }] }}><Pressable accessibilityRole="button" accessibilityLabel={props.social.status === 'sent' ? 'Cheer sent' : `Send Nice work to ${props.social.name}`} accessibilityState={{ disabled: ['loading', 'sending', 'sent'].includes(props.social.status), busy: props.social.status === 'sending' }} disabled={['loading', 'sending', 'sent'].includes(props.social.status)} onPress={() => void props.social?.onCheer()} style={({ pressed }) => [styles.cheer, { transform: [{ translateY: pressed ? 2 : 0 }], opacity: props.social?.status === 'loading' ? 0.5 : 1 }]}>
          {props.social.status === 'sending' ? <ActivityIndicator color="#5C440B" /> : <Ionicons name={props.social.status === 'sent' ? 'checkmark' : 'heart-outline'} color="#5C440B" size={18} />}
          <AppText style={styles.cheerLabel}>{props.social.status === 'sent' ? 'Cheer sent' : props.social.status === 'loading' ? 'Loading…' : props.social.status === 'sending' ? 'Sending…' : 'Nice work'}</AppText>
        </Pressable></Animated.View>
      </View> : null}
    </ScrollView>
    <Modal animationType="none" presentationStyle="overFullScreen" statusBarTranslucent transparent visible={sheet !== null} onRequestClose={() => setSheet(null)}>
      <View style={styles.modalBackdrop}>
        <BlurView intensity={24} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colorScheme === 'dark' ? 'rgba(22, 36, 43, 0.28)' : 'rgba(232, 248, 255, 0.30)' }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={() => setSheet(null)} style={StyleSheet.absoluteFill} />
        <Animated.View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.canvas, borderColor: colors.panelLine, paddingBottom: Math.max(insets.bottom, 16), opacity: sheetProgress, transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [44, 0] }) }] }]}>
          <View style={styles.sheetGrabber} />
          <View style={styles.circleHeader}><Copy colors={colors} accessibilityRole="header" style={[styles.circleTitle, styles.fill]}>{sheet === 'circles' ? 'Featured circle' : 'Your profile & health'}</Copy><Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={() => setSheet(null)} style={styles.switcher}><Ionicons name={Platform.OS === 'android' ? 'arrow-back' : 'close'} color={colors.ink} size={22} /></Pressable></View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {sheet === 'circles' ? props.circles.map((circle) => <Action key={circle.id} secondary colors={colors} busy={selecting === circle.id} disabled={selecting !== null} onPress={() => {
              setSelecting(circle.id); setSheetError(null);
              void props.onSelectCircle(circle.id).then(() => setSheet(null)).catch(() => setSheetError('That circle couldn’t be selected. Try again.')).finally(() => setSelecting(null));
            }}>{circle.name}{props.circle?.id === circle.id ? ' · Selected' : ''}</Action>) : <>
              <Action secondary colors={colors} onPress={() => { setSheet(null); props.onProfile(); }}>View your profile</Action>
              {props.onWalk ? <Action secondary colors={colors} onPress={() => { setSheet(null); props.onWalk?.(); }}>Open walking activity</Action> : null}
              <Copy colors={colors} accessibilityRole="header" style={styles.circleTitle}>Health connection</Copy>
              <Copy colors={colors} style={{ color: colors.muted }}>{props.health === 'confirmed' ? 'Connected' : props.health === 'stale' ? 'Today’s total may be incomplete' : props.health === 'loading' ? 'Checking access' : 'Access needs attention'} · {props.source}</Copy>
              <Copy colors={colors}>Your steps are synced from your health data. Refresh happens automatically when the provider and your phone make data available.</Copy>
              <Action colors={colors} busy={props.healthBusy || healthAction} onPress={() => void healthActionRun(props.onConnect)}>{props.health === 'confirmed' ? 'Refresh health data' : 'Connect or retry health access'}</Action>
              <Action secondary colors={colors} disabled={healthAction} onPress={() => void healthActionRun(props.onHealthSettings)}>Open phone health settings</Action>
              <Action secondary colors={colors} onPress={() => { setSheet(null); props.onGoal(); }}>Change daily goal</Action>
              {props.connectionError ? <Copy colors={colors} accessibilityRole="alert">{props.connectionError}</Copy> : null}
            </>}
            {sheetError ? <Copy colors={colors} accessibilityRole="alert">{sheetError}</Copy> : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { gap: 20, paddingBottom: 28 }, copy: { fontSize: 16, lineHeight: 23, includeFontPadding: false }, fill: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, wrap: { flexWrap: 'wrap' }, profile: { borderWidth: 2, borderBottomWidth: 4, width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontWeight: '800', fontSize: 14 }, streak: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 }, streakText: { fontWeight: '800', fontSize: 13 }, title: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 },
  hero: { borderWidth: 2, borderBottomWidth: 4, borderRadius: 22, position: 'relative' }, progressCopy: { width: '100%' }, label: { fontSize: 16, fontWeight: '800', paddingRight: 68 }, count: { fontSize: 48, lineHeight: 55, fontWeight: '800', letterSpacing: -1.5, fontVariant: ['tabular-nums'], paddingRight: 68 },
  goalLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingRight: 56 }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }, ring: { height: 64, width: 64, alignItems: 'center', justifyContent: 'center' }, ringLabel: { position: 'absolute', fontSize: 13, fontWeight: '800' }, remaining: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  companion: { position: 'absolute', top: 28, right: 14 }, shadow: { position: 'absolute', height: 5, bottom: 5, borderRadius: 20 }, sparkles: { position: 'absolute', top: 0, left: 0, right: 0 },
  circleCard: { borderWidth: 2, borderBottomWidth: 4, borderRadius: 20, gap: 12 }, eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 }, circleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, circleTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 }, switcher: { minHeight: 48, minWidth: 48, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, circleSummary: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, deadline: { gap: 2 }, standings: { gap: 6 }, standing: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, minHeight: 44, borderWidth: 1, borderRadius: 12 }, rank: { width: 24, textAlign: 'center', fontSize: 13, fontWeight: '800' }, standingName: { fontSize: 15, fontWeight: '700' }, standingSteps: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], flexShrink: 0 },
  action: { minHeight: 48, borderRadius: 12, borderWidth: 2, padding: 10, alignItems: 'center', justifyContent: 'center' }, actionLabel: { fontWeight: '800', textAlign: 'center' }, waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 96 }, empty: { gap: 12 },
  social: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 20 }, column: { flexDirection: 'column', alignItems: 'stretch' }, cheer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF5D2', borderColor: '#A17A12', borderWidth: 2, borderBottomWidth: 4, borderRadius: 12, padding: 10, minHeight: 48 }, cheerLabel: { color: '#5C440B', fontSize: 14, fontWeight: '800' },
  notice: { padding: 16, borderWidth: 1, borderRadius: 16 }, textAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, modalBackdrop: { flex: 1, justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderTopWidth: 2, maxHeight: '85%', padding: 20, gap: 12 }, sheetGrabber: { alignSelf: 'center', backgroundColor: '#B9E6F5', borderRadius: 999, height: 4, marginBottom: 2, width: 42 }, sheetContent: { gap: 16, paddingBottom: 8 },
});
