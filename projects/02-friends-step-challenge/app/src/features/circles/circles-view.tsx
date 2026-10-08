import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppSheet, AppText, SegmentedControl, Surface, type AppSheetFocusRef } from '@/components/ui';
import { MAX_CIRCLE_MEMBERS, type CircleVisibility } from '@/domain/circles';
import type { CircleHubPreview, CircleMember, CircleSummary, PublicCircleSummary } from '@/lib/circles';
import { useAppColors } from '@/design-system/use-app-theme';
import { spacing } from '@/design-system/tokens';

const ROW_HEIGHT = 86;
const PREVIEW_COUNT = 2;
const MARKERS = [
  { color: 'circleMarkerSky', icon: 'terrain' },
  { color: 'circleMarkerYellow', icon: 'home-outline' },
  { color: 'circleMarkerGreen', icon: 'tree-outline' },
  { color: 'circleMarkerCoral', icon: 'weather-sunny' },
] as const;

type CreateCircleInput = { name: string; discoverableArea: string; visibility: CircleVisibility };

export type CirclesViewProps = {
  circles: CircleSummary[];
  previews: Record<string, CircleHubPreview>;
  circleStatus: 'loading' | 'ready' | 'error';
  publicCircles: PublicCircleSummary[];
  publicStatus: 'loading' | 'ready' | 'error';
  busyCircleId: string | null;
  onOpenCircle: (circleId: string) => void;
  onRetryCircles: () => void;
  onRetryPublic: () => void;
  onCreate: (input: CreateCircleInput) => Promise<string | null>;
  onJoinInvite: (inviteCode: string) => Promise<string | null>;
  onJoinPublic: (circleId: string) => Promise<string | null>;
};

export function CirclesView(props: CirclesViewProps) {
  const colors = useAppColors();
  const styles = useCircleStyles();
  const { fontScale, width } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.3;
  const [page, setPage] = useState<'your-circles' | 'discover'>('your-circles');
  const [search, setSearch] = useState('');
  const [showAllPublic, setShowAllPublic] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const createButtonRef = useRef<View>(null);
  const searchRef = useRef<TextInput>(null);
  const joinedIds = useMemo(() => new Set(props.circles.map((circle) => circle.id)), [props.circles]);
  const availableCircles = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return props.publicCircles
      .filter((circle) => !joinedIds.has(circle.id))
      .filter((circle) => !needle || `${circle.name} ${circle.discoverableArea ?? ''}`.toLocaleLowerCase().includes(needle));
  }, [joinedIds, props.publicCircles, search]);
  const visibleCircles = showAllPublic ? availableCircles : availableCircles.slice(0, PREVIEW_COUNT);

  return (
    <>
      <ScrollView
        key={page}
        contentContainerStyle={[styles.content, compact && styles.compactContent]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={styles.page}
      >
        <View style={[styles.header, compact && styles.compactHeader]}>
          <View style={styles.headingLine}>
            <AppText style={styles.title}>Circles</AppText>
          </View>
          {page === 'your-circles' ? (
            <Pressable
              accessibilityLabel="Create a Circle"
              accessibilityRole="button"
              onPress={() => setShowSetup(true)}
              ref={createButtonRef}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
            >
              <Ionicons color={colors.accentPressed} name="add" size={18} />
              <AppText style={styles.createButtonText}>Create</AppText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.pageSwitch}>
          <SegmentedControl
            accessibilityLabel="Circle views"
            items={[{ label: 'Your Circles', value: 'your-circles' }, { label: 'Discover', value: 'discover' }] as const}
            onChange={setPage}
            value={page}
            variant="surface"
          />
        </View>

        {page === 'your-circles' ? (
          <View style={styles.joinedSection}>
            <View style={styles.sectionHeader}>
              <AppText accessibilityRole="header" style={styles.sectionTitle}>Your walking circles</AppText>
              <AppText style={styles.countLabel}>{props.circles.length} joined</AppText>
            </View>

            {props.circleStatus === 'loading' ? <CircleSkeleton /> : null}
            {props.circleStatus === 'error' ? (
              <InlineNotice title="Your circles didn’t load" action="Try again" onPress={props.onRetryCircles} />
            ) : null}
            {props.circleStatus === 'ready' && props.circles.length === 0 ? (
              <Surface padding="none" radius="md" style={styles.emptyJoined} variant="soft">
                <View style={styles.emptyIcon}><Ionicons color={colors.accentPressed} name="people-outline" size={23} /></View>
                <View style={styles.emptyCopy}>
                  <AppText style={styles.emptyTitle}>Your walking crew starts here</AppText>
                  <AppText style={styles.emptyBody}>Create a circle, join with an invite code, or find a public crew in Discover.</AppText>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setShowSetup(true)} style={styles.emptyAction}>
                  <AppText style={styles.emptyActionText}>Get started</AppText>
                </Pressable>
              </Surface>
            ) : null}
            {props.circleStatus === 'ready' && props.circles.length > 0 ? (
              <View style={styles.joinedList}>
                <WalkingTrail heights={props.circles.map((circle) => rowHeights[circle.id] ?? ROW_HEIGHT)} />
                {props.circles.map((circle, index) => (
                  <JoinedCircleRow
                    circle={circle}
                    index={index}
                    key={circle.id}
                    onLayout={(height) => setRowHeights((current) => current[circle.id] === height ? current : { ...current, [circle.id]: height })}
                    preview={props.previews[circle.id]}
                    onPress={() => props.onOpenCircle(circle.id)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.discoverSection}>
            <View style={styles.discoverHeading}>
              <AppText accessibilityRole="header" style={styles.sectionTitle}>Discover</AppText>
              <AppText style={styles.discoverAside}>Meet more walkers</AppText>
            </View>
            <AppText style={styles.discoverIntro}>Find your kind of walk.</AppText>

            <View style={styles.searchBox}>
              <Ionicons color={colors.muted} name="search" size={19} />
              <TextInput
                ref={searchRef}
                accessibilityLabel="Search public Circles"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSearch}
                placeholder="Search by circle or area"
                placeholderTextColor={colors.placeholder}
                returnKeyType="search"
                style={styles.searchInput}
                value={search}
              />
              {search ? (
                <Pressable accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons color={colors.muted} name="close-circle" size={19} />
                </Pressable>
              ) : null}
            </View>

            {props.publicStatus === 'loading' ? <CircleSkeleton compact /> : null}
            {props.publicStatus === 'error' ? (
              <InlineNotice title="Public circles are unavailable right now" action="Try again" onPress={props.onRetryPublic} />
            ) : null}
            {props.publicStatus === 'ready' && availableCircles.length === 0 ? (
              <View style={styles.noResults}>
                <Ionicons color={colors.muted} name={search ? 'search-outline' : 'walk-outline'} size={22} />
                <AppText style={styles.noResultsText}>
                  {search ? 'No Circles match that search. Try another name.' : 'No public Circles are available yet.'}
                </AppText>
              </View>
            ) : null}
            {props.publicStatus === 'ready' && visibleCircles.length > 0 ? (
              <View style={styles.discoverList}>
                {visibleCircles.map((circle, index) => (
                  <PublicCircleRow
                    busy={props.busyCircleId === circle.id}
                    circle={circle}
                    index={index}
                    key={circle.id}
                    onPress={() => Alert.alert(
                      `Join ${circle.name}?`,
                      'You’ll become a member of this public walking circle.',
                      [
                        { text: 'Not now', style: 'cancel' },
                        { text: 'Join circle', onPress: () => void joinPublic(circle, props.onJoinPublic) },
                      ],
                    )}
                  />
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setShowAllPublic(true);
                searchRef.current?.focus();
              }}
              style={({ pressed }) => [styles.exploreButton, pressed && styles.pressed]}
            >
              <AppText style={styles.exploreText}>Explore more Circles</AppText>
              <Ionicons color={colors.ink} name="arrow-forward" size={18} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      <CircleSetupModal
        visible={showSetup}
        onClose={() => setShowSetup(false)}
        onCreate={props.onCreate}
        onJoinInvite={props.onJoinInvite}
        returnFocusRef={createButtonRef}
      />
    </>
  );
}

async function joinPublic(circle: PublicCircleSummary, action: CirclesViewProps['onJoinPublic']) {
  if (circle.joinPolicy !== 'open' || circle.memberCount >= MAX_CIRCLE_MEMBERS) return;
  try {
    const message = await action(circle.id);
    if (message) Alert.alert('Could not join circle', message);
  } catch (error) {
    Alert.alert('Could not join circle', getMessage(error));
  }
}

function WalkingTrail({ heights }: { heights: number[] }) {
  const colors = useAppColors();
  const styles = useCircleStyles();
  if (heights.length < 2) return null;
  const totalHeight = heights.reduce((total, height) => total + height, 0);
  let previousCenter = heights[0]! / 2;
  let path = `M 26 ${previousCenter}`;
  for (let index = 1; index < heights.length; index += 1) {
    const nextCenter = previousCenter + heights[index - 1]! / 2 + heights[index]! / 2;
    const bend = index % 2 === 1 ? 47 : 5;
    path += ` C ${bend} ${previousCenter + 22}, ${bend} ${nextCenter - 22}, 26 ${nextCenter}`;
    previousCenter = nextCenter;
  }

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.trail}>
      <Svg height={totalHeight} width={52}>
        <Path d={path} fill="none" stroke={colors.soft} strokeLinecap="round" strokeWidth={8} />
        <Path d={path} fill="none" stroke={colors.controlPrimary} strokeDasharray="1 6" strokeLinecap="round" strokeWidth={3} />
      </Svg>
    </View>
  );
}

function JoinedCircleRow({ circle, index, onLayout, preview, onPress }: {
  circle: CircleSummary; index: number; onLayout: (height: number) => void; preview?: CircleHubPreview; onPress: () => void;
}) {
  const colors = useAppColors();
  const styles = useCircleStyles();
  const marker = MARKERS[index % MARKERS.length];
  const walkingText = preview ? `${preview.walkingTodayCount} walking today` : 'Walking with your people';

  return (
    <Pressable
      accessibilityLabel={`Open ${circle.name}${preview ? `, ${preview.walkingTodayCount} walking today` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      onLayout={(event) => onLayout(event.nativeEvent.layout.height)}
      style={({ pressed }) => [styles.joinedRow, pressed && styles.rowPressed]}
    >
      <View style={[styles.circleMarker, { backgroundColor: colors[marker.color] }]}>
        <MaterialCommunityIcons color={colors.ink} name={marker.icon} size={20} />
      </View>
      <View style={styles.joinedCopy}>
        <AppText style={styles.circleName}>{circle.name}</AppText>
        <View style={styles.walkingMeta}>
          {preview?.members.length ? <AvatarStack members={preview.members} /> : null}
          <AppText style={styles.walkingToday}>{walkingText}</AppText>
        </View>
      </View>
      <Ionicons color={colors.placeholder} name="chevron-forward" size={19} />
    </Pressable>
  );
}

function AvatarStack({ members }: { members: CircleMember[] }) {
  const styles = useCircleStyles();
  return (
    <View accessibilityLabel={`${members.length} circle member avatars`} style={styles.avatarStack}>
      {members.slice(0, 3).map((member, index) => (
        <View key={member.userId} style={[styles.avatarFrame, index > 0 && styles.avatarOverlap]}>
          <DicebearAvatar choice={{ seed: member.avatarSeed, style: member.avatarStyle }} fallback={getInitials(member.displayName)} size={23} />
        </View>
      ))}
    </View>
  );
}

function PublicCircleRow({ circle, index, busy, onPress }: {
  circle: PublicCircleSummary; index: number; busy: boolean; onPress: () => void;
}) {
  const colors = useAppColors();
  const styles = useCircleStyles();
  const marker = MARKERS[(index + 1) % MARKERS.length];
  const isFull = circle.memberCount >= MAX_CIRCLE_MEMBERS;
  const unavailable = circle.joinPolicy !== 'open' || isFull;
  const area = circle.discoverableArea || 'Open walking circle';

  return (
    <Pressable
      accessibilityLabel={`${circle.name}, ${circle.memberCount} members${circle.discoverableArea ? `, ${circle.discoverableArea}` : ''}${isFull ? ', full' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || unavailable, busy }}
      disabled={busy || unavailable}
      onPress={onPress}
      style={({ pressed }) => [styles.publicRow, pressed && !unavailable && styles.rowPressed, unavailable && styles.publicUnavailable]}
    >
      <View style={[styles.publicMarker, { backgroundColor: colors[marker.color] }]}>
        <MaterialCommunityIcons color={colors.ink} name={marker.icon} size={18} />
      </View>
      <View style={styles.publicCopy}>
        <AppText style={styles.circleName}>{circle.name}</AppText>
        <AppText style={styles.publicMeta}>
          {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'} · {unavailable ? isFull ? 'Circle is full' : 'Approval required' : area}
        </AppText>
      </View>
      {busy ? <ActivityIndicator color={colors.accentPressed} size="small" /> : <Ionicons color={unavailable ? colors.placeholder : colors.muted} name="chevron-forward" size={19} />}
    </Pressable>
  );
}

function CircleSkeleton({ compact = false }: { compact?: boolean }) {
  const colors = useAppColors();
  const styles = useCircleStyles();
  const rows = compact ? 2 : 2;
  return (
    <View accessibilityLabel="Loading circles" style={styles.skeletonList}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.skeletonRow, compact && styles.skeletonCompact]}>
          <View style={styles.skeletonMarker} />
          <View style={styles.skeletonCopy}><View style={styles.skeletonLine} /><View style={styles.skeletonSmallLine} /></View>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      ))}
    </View>
  );
}

function InlineNotice({ title, action, onPress }: { title: string; action: string; onPress: () => void }) {
  const styles = useCircleStyles();
  return (
    <View style={styles.notice}>
      <AppText style={styles.noticeText}>{title}</AppText>
      <Pressable accessibilityLabel={`Retry ${title}`} accessibilityRole="button" onPress={onPress} hitSlop={8}><AppText style={styles.noticeAction}>{action}</AppText></Pressable>
    </View>
  );
}

function CircleSetupModal({ visible, onClose, onCreate, onJoinInvite, returnFocusRef }: {
  visible: boolean; onClose: () => void;
  onCreate: CirclesViewProps['onCreate']; onJoinInvite: CirclesViewProps['onJoinInvite']; returnFocusRef: AppSheetFocusRef;
}) {
  const colors = useAppColors();
  const styles = useCircleStyles();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [visibility, setVisibility] = useState<CircleVisibility>('private');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<View>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const message = mode === 'create'
        ? await onCreate({ name, discoverableArea: area, visibility })
        : await onJoinInvite(inviteCode);
      if (message) {
        setError(message);
        return;
      }
      setName('');
      setArea('');
      setInviteCode('');
      onClose();
    } catch (error) {
      setError(getMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppSheet
      accessibilityLabel="Circle setup"
      initialFocusRef={closeButtonRef}
      keyboardAware
      onClose={onClose}
      returnFocusRef={returnFocusRef}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderCopy}>
          <AppText style={styles.sheetTitle}>{mode === 'create' ? 'Start a walking circle' : 'Join your people'}</AppText>
          <AppText style={styles.sheetSubtitle}>{mode === 'create' ? 'Make every walk a little more social.' : 'Enter the private invite code you received.'}</AppText>
        </View>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} ref={closeButtonRef} hitSlop={8} style={styles.closeButton}>
          <Ionicons color={colors.muted} name="close" size={21} />
        </Pressable>
      </View>
      <View style={styles.segment}>
        <SegmentedControl
          accessibilityLabel="Circle setup mode"
          items={[{ label: 'Create', value: 'create' }, { label: 'Join with code', value: 'join' }] as const}
          onChange={(value) => { setMode(value); setError(null); }}
          value={mode}
          variant="surface"
        />
      </View>
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        {mode === 'create' ? <>
          <FieldLabel>CIRCLE NAME</FieldLabel>
          <TextInput accessibilityLabel="Circle name" autoCapitalize="words" maxLength={40} onChangeText={setName} placeholder="e.g. Saturday Walkers" placeholderTextColor={colors.placeholder} style={styles.input} value={name} />
          <FieldLabel>VISIBILITY</FieldLabel>
          <View style={styles.segment}>
            <SegmentedControl
              accessibilityLabel="Circle visibility"
              items={[{ label: 'Private', value: 'private' }, { label: 'Public', value: 'public' }] as const}
              onChange={setVisibility}
              value={visibility}
              variant="surface"
            />
          </View>
          {visibility === 'public' ? <>
            <FieldLabel>DISCOVERY AREA</FieldLabel>
            <TextInput accessibilityLabel="Discovery area" autoCapitalize="words" maxLength={60} onChangeText={setArea} placeholder="e.g. Yaba or Ikeja" placeholderTextColor={colors.placeholder} style={styles.input} value={area} />
            <AppText style={styles.helper}>Use a city or broad neighborhood only. Never enter a home address.</AppText>
            <AppText style={styles.helper}>Anyone can discover and join. Circles are limited to {MAX_CIRCLE_MEMBERS} walkers.</AppText>
          </> : <AppText style={styles.helper}>Only people with your invite code can join. Circles are limited to {MAX_CIRCLE_MEMBERS} walkers.</AppText>}
        </> : <>
          <FieldLabel>PRIVATE INVITE CODE</FieldLabel>
          <TextInput accessibilityLabel="Circle invite code" autoCapitalize="characters" autoCorrect={false} maxLength={8} onChangeText={setInviteCode} placeholder="ABCDEFGH" placeholderTextColor={colors.placeholder} style={[styles.input, styles.codeInput]} value={inviteCode} />
          <AppText style={styles.helper}>Ask the circle creator to share their private code with you.</AppText>
        </>}
        {error ? <AppText accessibilityLiveRegion="polite" style={styles.formError}>{error}</AppText> : null}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void submit()} style={[styles.submitButton, busy && styles.submitDisabled]}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <AppText style={styles.submitText}>{mode === 'create' ? 'Create walking circle' : 'Join circle'}</AppText>}
        </Pressable>
      </ScrollView>
    </AppSheet>
  );
}

function FieldLabel({ children }: { children: string }) {
  const styles = useCircleStyles();
  return <AppText style={styles.fieldLabel}>{children}</AppText>;
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'SC';
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

type CircleThemeColors = ReturnType<typeof useAppColors>;

function useCircleStyles() {
  const colors = useAppColors();
  return useMemo(() => createCircleStyles(colors), [colors]);
}

function createCircleStyles(colors: CircleThemeColors) { return StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  compactContent: { paddingHorizontal: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 54 },
  compactHeader: { flexWrap: 'wrap', rowGap: spacing.sm },
  headingLine: { alignItems: 'baseline', flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingRight: 8 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -1.1, lineHeight: 36 },
  createButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 4, minHeight: 44, paddingHorizontal: 12, shadowColor: colors.background, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  createButtonText: { color: colors.accentPressed, fontSize: 13, fontWeight: '800' },
  pageSwitch: { marginTop: 10 },
  joinedSection: { marginTop: 14 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.25 },
  countLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  joinedList: { position: 'relative' },
  trail: { height: '100%', left: 0, position: 'absolute', top: 0, width: 52, zIndex: 0 },
  joinedRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: ROW_HEIGHT, paddingHorizontal: 5, paddingVertical: 12, zIndex: 1 },
  circleMarker: { alignItems: 'center', borderColor: colors.card, borderRadius: 20, borderWidth: 2, elevation: 2, height: 40, justifyContent: 'center', shadowColor: colors.background, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 2, width: 40 },
  joinedCopy: { flex: 1, justifyContent: 'center', marginLeft: 12, minWidth: 0 },
  circleName: { color: colors.ink, flexShrink: 1, fontSize: 15, fontWeight: '800', letterSpacing: -0.15, lineHeight: 20 },
  walkingMeta: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, minHeight: 23 },
  walkingToday: { color: colors.success, flexShrink: 1, fontSize: 11, fontWeight: '800', lineHeight: 16 },
  avatarStack: { alignItems: 'center', flexDirection: 'row', marginRight: 8, paddingLeft: 1 },
  avatarFrame: { backgroundColor: colors.card, borderColor: colors.card, borderRadius: 13, borderWidth: 1.5, height: 26, overflow: 'hidden', width: 26 },
  avatarOverlap: { marginLeft: -7 },
  rowPressed: { backgroundColor: colors.soft },
  discoverSection: { paddingTop: 14 },
  discoverHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  discoverAside: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  discoverIntro: { color: colors.muted, fontSize: 13, marginTop: 3 },
  searchBox: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 9, height: 48, marginTop: 13, paddingHorizontal: 14 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 14, minHeight: 44, paddingVertical: 0 },
  discoverList: { marginTop: 5 },
  publicRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 76, paddingHorizontal: 1, paddingVertical: 14 },
  publicMarker: { alignItems: 'center', borderRadius: 17, height: 36, justifyContent: 'center', width: 36 },
  publicCopy: { flex: 1, marginLeft: 12, minWidth: 0 },
  publicMeta: { color: colors.muted, flexShrink: 1, fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 4 },
  publicUnavailable: { opacity: 0.68 },
  exploreButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, minHeight: 52, paddingHorizontal: 15 },
  exploreText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  noResults: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 15, flexDirection: 'row', gap: 10, marginTop: 12, minHeight: 62, paddingHorizontal: 14 },
  noResultsText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  emptyJoined: { alignItems: 'center', backgroundColor: colors.soft, borderColor: colors.subtleBorder, borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 11, marginTop: 8, padding: 13 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  emptyAction: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8 },
  emptyActionText: { color: colors.onAccent, fontSize: 11, fontWeight: '800' },
  skeletonList: { marginTop: 4 },
  skeletonRow: { alignItems: 'center', flexDirection: 'row', height: ROW_HEIGHT, paddingHorizontal: 3 },
  skeletonCompact: { height: 71 },
  skeletonMarker: { backgroundColor: colors.soft, borderRadius: 20, height: 38, width: 38 },
  skeletonCopy: { flex: 1, gap: 8, marginLeft: 12 },
  skeletonLine: { backgroundColor: colors.border, borderRadius: 5, height: 13, width: '53%' },
  skeletonSmallLine: { backgroundColor: colors.subtleBorder, borderRadius: 5, height: 9, width: '68%' },
  notice: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, minHeight: 54, paddingHorizontal: 13 },
  noticeText: { color: colors.muted, flex: 1, fontSize: 12, paddingRight: 8 },
  noticeAction: { color: colors.accentPressed, fontSize: 12, fontWeight: '800' },
  sheet: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sheetHeaderCopy: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  sheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  sheetSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  closeButton: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  segment: { marginTop: 16 },
  formContent: { gap: 11, paddingBottom: 8, paddingTop: 18 },
  fieldLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 49, paddingHorizontal: 14 },
  codeInput: { fontVariant: ['tabular-nums'], fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  helper: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  formError: { backgroundColor: colors.dangerSurface, borderRadius: 10, color: colors.dangerContent, fontSize: 12, lineHeight: 18, padding: 10 },
  submitButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 13, justifyContent: 'center', marginTop: 3, minHeight: 50 },
  submitText: { color: colors.onAccent, fontSize: 14, fontWeight: '800' },
  submitDisabled: { opacity: 0.65 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
}); }
