import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/PressableScale';
import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText, IconButton, StateCard } from '@/components/ui';
import { MAX_CIRCLE_MESSAGE_LENGTH, type CircleMessage } from '@/domain/circle-chat';
import type { CircleMember } from '@/lib/circles';
import { spacing, touchTargets } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import type { CircleChatStatus } from '@/hooks/use-circle-chat';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export type CircleChatViewProps = {
  circleName: string;
  memberCount: number;
  members: CircleMember[];
  currentUserId: string;
  messages: CircleMessage[];
  status: CircleChatStatus;
  error: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  onBack: () => void;
  onRetry: () => void;
  onLoadOlder: () => void;
  onSend: (body: string) => Promise<boolean>;
  onRetryMessage: (messageId: string) => void;
  blockedUserIds?: ReadonlySet<string>;
  onReportMessage?: (message: CircleMessage) => void;
  onReportMember?: (member: CircleMember) => void;
  onBlockMember?: (member: CircleMember, shouldBlock: boolean) => void;
};

export function CircleChatView(props: CircleChatViewProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<CircleMessage>>(null);
  const reducedMotion = useReducedMotion();
  const nearLatest = useRef(true);
  const lastTail = useRef<string | undefined>(undefined);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [hasScrolledToLatest, setHasScrolledToLatest] = useState(false);
  const canSend = Boolean(draft.trim()) && !sending;
  const seenMessages = useRef<MessageHistory>({
    ready: props.status === 'ready',
    ids: new Set(props.messages.map(message => message.id)),
    latest: newestMessageTime(props.messages),
  });

  useEffect(() => {
    if (props.status !== 'ready' || seenMessages.current.ready) return;
    // Baseline only the first loaded batch. Later rows may mount asynchronously
    // through FlatList; marking them seen here would suppress their entrances.
    const history = seenMessages.current;
    history.ready = true;
    props.messages.forEach(message => history.ids.add(message.id));
    history.latest = newestMessageTime(props.messages);
  }, [props.messages, props.status]);

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const sent = await props.onSend(draft);
    if (sent) {
      setDraft('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: !reducedMotion }), 40);
    }
    setSending(false);
  }, [canSend, draft, props, reducedMotion]);

  const renderMessage = useCallback(({ item, index }: { item: CircleMessage; index: number }) => {
    const isYou = item.author.id === props.currentUserId;
    const previous = props.messages[index - 1];
    const showDate = !previous || dateKey(previous.createdAt) !== dateKey(item.createdAt);
    const displayName = isYou ? 'You' : item.author.displayName;
    const author = memberForMessage(item, props.members);
    const hasSafetyActions = !isYou && props.onReportMessage && props.onReportMember && props.onBlockMember;
    return <MessageEntrance history={seenMessages} message={item} reducedMotion={reducedMotion}>
      {showDate ? <View style={styles.dateDivider}><View style={styles.dateLine} /><AppText variant="eyebrow" tone="secondary" style={styles.dateLabel}>{dateLabel(item.createdAt)}</AppText><View style={styles.dateLine} /></View> : null}
      <View style={[styles.message, isYou && styles.messageYou]}>
        {!isYou ? <MemberAvatar member={memberForMessage(item, props.members)} size={32} /> : null}
        <View style={[styles.messageContent, isYou && styles.messageContentYou]}>
          <View style={styles.messageAuthorLine}>
            <AppText numberOfLines={1} variant="label" style={[styles.authorName, hasSafetyActions && styles.authorNameFlexible]}>{displayName}</AppText>
            {hasSafetyActions ? <Pressable
              accessibilityLabel={`Safety options for ${displayName}'s message`}
              accessibilityRole="button"
              onPress={() => {
                const blocked = props.blockedUserIds?.has(author.userId) ?? false;
                Alert.alert(displayName, undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Report message', onPress: () => props.onReportMessage?.(item) },
                  { text: 'Report member', onPress: () => props.onReportMember?.(author) },
                  { text: blocked ? 'Unblock person' : 'Block person', style: blocked ? undefined : 'destructive', onPress: () => props.onBlockMember?.(author, !blocked) },
                ]);
              }}
              style={({ pressed }) => [styles.messageOptions, pressed && styles.messageOptionsPressed]}
            ><Ionicons color={colors.muted} name="ellipsis-horizontal" size={17} /></Pressable> : null}
          </View>
          <View style={[styles.bubble, isYou ? styles.bubbleYou : styles.bubbleOther, item.status === 'error' && styles.bubbleError]}>
            <AppText selectable variant="body" style={[styles.messageBody, isYou && styles.messageBodyYou]}>{item.body}</AppText>
            <View style={styles.bubbleFooter}>
              <AppText variant="caption" style={[styles.messageTime, isYou && styles.messageTimeYou]}>{formatTime(item.createdAt)}</AppText>
              {item.status === 'pending' ? <View style={styles.messageStatus}><ActivityIndicator color={isYou ? colors.onAccent : colors.accentPressed} size="small" /><AppText variant="caption" style={[styles.statusText, isYou && styles.statusTextYou]}>Sending…</AppText></View> : item.status === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel="Retry sending message" onPress={() => props.onRetryMessage(item.id)} style={styles.retryMessage}><AppText variant="caption" tone="danger">Tap to retry</AppText></Pressable> : null}
            </View>
          </View>
        </View>
      </View>
    </MessageEntrance>;
  }, [colors.accentPressed, colors.muted, colors.onAccent, props, reducedMotion, seenMessages, styles]);

  if (props.status === 'loading' || props.status === 'idle') return <LoadingChatView circleName={props.circleName} onBack={props.onBack} />;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.page}>
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <IconButton accessibilityLabel="Go back to circle" onPress={props.onBack} style={styles.headerButton}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
      <View style={styles.headerCopy}><AppText accessibilityRole="header" style={styles.title} variant="titleSmall">{props.circleName}</AppText><AppText tone="secondary" variant="caption" style={styles.subtitle}>{props.memberCount} {props.memberCount === 1 ? 'walker' : 'walkers'}</AppText></View>
      <View accessible={false} style={styles.headerSpacer} />
    </View>

    {props.status === 'error' ? <View style={styles.errorContent}><StateCard actionLabel="Try again" description={props.error ?? 'Check your connection and try again.'} onAction={props.onRetry} title="Circle chat unavailable" tone="error" /></View> : <>
      <FlatList
        ref={listRef}
        contentContainerStyle={[styles.messageList, props.messages.length === 0 && styles.emptyMessageList]}
        data={props.messages}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons color={colors.accentPressed} name="chatbubbles-outline" size={28} /></View><AppText variant="titleSmall" style={styles.emptyTitle}>Start the conversation</AppText><AppText tone="secondary" variant="bodySmall" style={styles.emptyCopy}>Say hello to your circle and make the next walk a little easier to start.</AppText></View>}
        ListHeaderComponent={props.hasMore ? <Pressable accessibilityRole="button" disabled={props.loadingOlder} onPress={props.onLoadOlder} style={styles.olderButton}>{props.loadingOlder ? <ActivityIndicator color={colors.accentPressed} size="small" /> : <Ionicons color={colors.accentPressed} name="arrow-up" size={16} />}<AppText variant="label" style={styles.olderButtonText}>{props.loadingOlder ? 'Loading older messages…' : 'Load older messages'}</AppText></Pressable> : null}
        onScroll={({ nativeEvent }) => {
          nearLatest.current = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y < 80;
        }}
        scrollEventThrottle={32}
        onContentSizeChange={() => {
          const tail = props.messages.at(-1)?.id;
          const appended = tail !== lastTail.current;
          lastTail.current = tail;
          if (tail && (!hasScrolledToLatest || (appended && nearLatest.current))) {
            listRef.current?.scrollToEnd({ animated: hasScrolledToLatest && !reducedMotion });
            if (!hasScrolledToLatest) setHasScrolledToLatest(true);
          }
        }}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />
    </>}

    {props.error && props.status === 'ready' ? <View accessibilityLiveRegion="polite" style={styles.errorBanner}><Ionicons color={colors.dangerContent} name="alert-circle-outline" size={17} /><AppText tone="danger" variant="caption" style={styles.errorText}>{props.error}</AppText></View> : null}
    {props.status !== 'error' ? <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <TextInput accessibilityLabel="Message the circle" autoCorrect editable={!sending} maxLength={MAX_CIRCLE_MESSAGE_LENGTH} multiline onChangeText={setDraft} placeholder="Message the circle…" placeholderTextColor={colors.placeholder} style={styles.input} textAlignVertical="center" value={draft} />
      <PressableScale accessibilityLabel={sending ? 'Sending message' : 'Send message'} accessibilityRole="button" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={() => void send()} style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}>{sending ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons color={colors.onAccent} name="arrow-up" size={21} />}</PressableScale>
    </View> : null}
  </KeyboardAvoidingView>;
}

function newestMessageTime(messages: CircleMessage[]) {
  return messages.reduce((latest, message) => Math.max(latest, message.createdAt.getTime()), 0);
}

type MessageHistory = { ready: boolean; ids: Set<string>; latest: number };

function MessageEntrance({ children, history, message, reducedMotion }: { children: React.ReactNode; history: React.RefObject<MessageHistory>; message: CircleMessage; reducedMotion: boolean }) {
  // Read arrival history only at commit, never during render. Remember consumed
  // IDs so acknowledgements and virtualized remounts cannot replay entrances.
  const [arrival] = useState(() => ({ id: message.id, time: message.createdAt.getTime(), pending: message.status === 'pending' }));
  const [progress] = useState(() => new Animated.Value(1));
  useLayoutEffect(() => {
    const seen = history.current;
    const enter = seen.ready && !seen.ids.has(arrival.id) && (arrival.pending || arrival.time >= seen.latest);
    seen.ids.add(arrival.id);
    if (!enter || reducedMotion) {
      progress.stopAnimation(); progress.setValue(1); return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: 180, easing: Easing.out(Easing.cubic),
      isInteraction: false, useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [arrival, history, progress, reducedMotion]);
  return <Animated.View testID={`chat-message-entry-${message.id}`} style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}

function LoadingChatView({ circleName, onBack }: { circleName: string; onBack: () => void }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.page}><View style={styles.loadingHeader}><IconButton accessibilityLabel="Go back to circle" onPress={onBack}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton><View style={styles.headerCopy}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>{circleName}</AppText></View><View accessible={false} style={styles.headerSpacer} /></View><View style={styles.loadingContent}>{[0, 1, 2].map((item) => <View key={item} style={[styles.loadingBubble, item === 1 && styles.loadingBubbleYou]} />)}</View></View>;
}

function MemberAvatar({ member, size }: { member: CircleMember; size: number }) {
  return <DicebearAvatar choice={{ seed: member.avatarSeed, style: member.avatarStyle, photoURL: member.photoURL }} fallback={getInitials(member.displayName)} size={size} />;
}

function memberForMessage(message: CircleMessage, members: CircleMember[]) {
  return members.find((member) => member.userId === message.author.id) ?? {
    avatarSeed: message.author.avatarSeed,
    avatarStyle: message.author.avatarStyle,
    displayName: message.author.displayName,
    role: 'member' as const,
    userId: message.author.id,
  };
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dateLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (dateKey(date) === dateKey(today)) return 'TODAY';
  if (dateKey(date) === dateKey(yesterday)) return 'YESTERDAY';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date).toUpperCase();
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  page: { backgroundColor: colors.background, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  headerButton: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }, headerCopy: { alignItems: 'center', flex: 1, minWidth: 0 }, headerSpacer: { height: touchTargets.minimum, width: touchTargets.minimum }, title: { alignSelf: 'stretch', color: colors.ink, flexShrink: 1, fontSize: 19, lineHeight: 23, textAlign: 'center' }, subtitle: { marginTop: 1 },
  messageAuthorLine: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs }, authorNameFlexible: { flex: 1, minWidth: 0 }, messageOptions: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', marginTop: -spacing.xs, width: 36 }, messageOptionsPressed: { backgroundColor: colors.soft },
  messageList: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, emptyMessageList: { justifyContent: 'center' }, dateDivider: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.sm }, dateLine: { backgroundColor: colors.border, flex: 1, height: 1 }, dateLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.1 }, message: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }, messageYou: { justifyContent: 'flex-end' }, messageContent: { maxWidth: '86%' }, messageContentYou: { alignItems: 'flex-end' }, authorName: { color: colors.ink, marginBottom: spacing.xs }, bubble: { maxWidth: '100%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, bubbleOther: { backgroundColor: colors.soft, borderBottomLeftRadius: 6 }, bubbleYou: { backgroundColor: colors.accent, borderBottomRightRadius: 6 }, bubbleError: { borderColor: colors.dangerContent, borderWidth: 1 }, messageBody: { color: colors.ink, fontSize: 15, lineHeight: 21 }, messageBodyYou: { color: colors.onAccent }, bubbleFooter: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'flex-end', marginTop: spacing.xs }, messageTime: { color: colors.muted, fontSize: 11 }, messageTimeYou: { color: colors.onAccent, opacity: 0.82 }, messageStatus: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs }, statusText: { color: colors.accentPressed }, statusTextYou: { color: colors.onAccent }, retryMessage: { justifyContent: 'center', minHeight: 24 },
  olderButton: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md }, olderButtonText: { color: colors.accentPressed, fontSize: 11 }, emptyState: { alignItems: 'center', paddingHorizontal: spacing.xxl }, emptyIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: spacing.md, width: 48 }, emptyTitle: { textAlign: 'center' }, emptyCopy: { lineHeight: 20, marginTop: spacing.xs, textAlign: 'center' }, errorContent: { flex: 1, justifyContent: 'center', padding: spacing.lg }, errorBanner: { alignItems: 'center', backgroundColor: colors.dangerSurface, flexDirection: 'row', gap: spacing.xs, marginHorizontal: spacing.lg, marginBottom: spacing.xs, padding: spacing.sm }, errorText: { flex: 1 }, composer: { alignItems: 'flex-end', backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }, input: { backgroundColor: colors.soft, borderColor: colors.border, borderRadius: 22, borderWidth: 1, color: colors.ink, flex: 1, fontSize: 15, lineHeight: 20, maxHeight: 112, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, sendButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 }, sendButtonDisabled: { backgroundColor: colors.border }, 
  loadingHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg }, loadingContent: { flex: 1, gap: spacing.lg, justifyContent: 'flex-end', padding: spacing.lg }, loadingBubble: { alignSelf: 'flex-start', backgroundColor: colors.borderSubtle, borderRadius: 18, height: 72, width: '68%' }, loadingBubbleYou: { alignSelf: 'flex-end', height: 56, width: '62%' },
}); }
