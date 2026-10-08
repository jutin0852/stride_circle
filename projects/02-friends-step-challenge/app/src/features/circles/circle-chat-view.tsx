import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DicebearAvatar } from '@/components/dicebear-avatar';
import { AppText, IconButton, StateCard } from '@/components/ui';
import { MAX_CIRCLE_MESSAGE_LENGTH, type CircleMessage } from '@/domain/circle-chat';
import type { CircleMember } from '@/lib/circles';
import { spacing, touchTargets } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';
import type { CircleChatStatus } from '@/hooks/use-circle-chat';

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
};

export function CircleChatView(props: CircleChatViewProps) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<CircleMessage>>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [hasScrolledToLatest, setHasScrolledToLatest] = useState(false);
  const canSend = Boolean(draft.trim()) && !sending;

  const send = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const sent = await props.onSend(draft);
    if (sent) {
      setDraft('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
    }
    setSending(false);
  }, [canSend, draft, props]);

  const renderMessage = useCallback(({ item, index }: { item: CircleMessage; index: number }) => {
    const isYou = item.author.id === props.currentUserId;
    const previous = props.messages[index - 1];
    const showDate = !previous || dateKey(previous.createdAt) !== dateKey(item.createdAt);
    const displayName = isYou ? 'You' : item.author.displayName;
    return <View>
      {showDate ? <View style={styles.dateDivider}><View style={styles.dateLine} /><AppText variant="eyebrow" tone="secondary" style={styles.dateLabel}>{dateLabel(item.createdAt)}</AppText><View style={styles.dateLine} /></View> : null}
      <View style={[styles.message, isYou && styles.messageYou]}>
        {!isYou ? <MemberAvatar member={memberForMessage(item, props.members)} size={32} /> : null}
        <View style={[styles.messageContent, isYou && styles.messageContentYou]}>
          <AppText variant="label" style={styles.authorName}>{displayName}</AppText>
          <View style={[styles.bubble, isYou ? styles.bubbleYou : styles.bubbleOther, item.status === 'error' && styles.bubbleError]}>
            <AppText selectable variant="body" style={[styles.messageBody, isYou && styles.messageBodyYou]}>{item.body}</AppText>
            <View style={styles.bubbleFooter}>
              <AppText variant="caption" style={[styles.messageTime, isYou && styles.messageTimeYou]}>{formatTime(item.createdAt)}</AppText>
              {item.status === 'pending' ? <View style={styles.messageStatus}><ActivityIndicator color={isYou ? colors.onAccent : colors.accentPressed} size="small" /><AppText variant="caption" style={[styles.statusText, isYou && styles.statusTextYou]}>Sending…</AppText></View> : item.status === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel="Retry sending message" onPress={() => props.onRetryMessage(item.id)} style={styles.retryMessage}><AppText variant="caption" tone="danger">Tap to retry</AppText></Pressable> : null}
            </View>
          </View>
        </View>
      </View>
    </View>;
  }, [colors.accentPressed, colors.onAccent, props, styles]);

  if (props.status === 'loading' || props.status === 'idle') return <LoadingChatView circleName={props.circleName} onBack={props.onBack} />;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.page}>
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <IconButton accessibilityLabel="Go back to circle" onPress={props.onBack} style={styles.headerButton}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
      <View style={styles.headerCopy}><AppText accessibilityRole="header" numberOfLines={1} style={styles.title} variant="titleSmall">{props.circleName}</AppText><AppText tone="secondary" variant="caption" style={styles.subtitle}>{props.memberCount} {props.memberCount === 1 ? 'walker' : 'walkers'}</AppText></View>
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
        onContentSizeChange={() => { if (!hasScrolledToLatest && props.messages.length > 0) { listRef.current?.scrollToEnd({ animated: false }); setHasScrolledToLatest(true); } }}
        renderItem={renderMessage}
        showsVerticalScrollIndicator={false}
      />
    </>}

    {props.error && props.status === 'ready' ? <View accessibilityLiveRegion="polite" style={styles.errorBanner}><Ionicons color={colors.dangerContent} name="alert-circle-outline" size={17} /><AppText tone="danger" variant="caption" style={styles.errorText}>{props.error}</AppText></View> : null}
    {props.status !== 'error' ? <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <TextInput accessibilityLabel="Message the circle" autoCorrect editable={!sending} maxLength={MAX_CIRCLE_MESSAGE_LENGTH} multiline onChangeText={setDraft} placeholder="Message the circle…" placeholderTextColor={colors.placeholder} style={styles.input} textAlignVertical="center" value={draft} />
      <Pressable accessibilityLabel={sending ? 'Sending message' : 'Send message'} accessibilityRole="button" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={() => void send()} style={({ pressed }) => [styles.sendButton, !canSend && styles.sendButtonDisabled, pressed && styles.sendButtonPressed]}>{sending ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons color={colors.onAccent} name="arrow-up" size={21} />}</Pressable>
    </View> : null}
  </KeyboardAvoidingView>;
}

function LoadingChatView({ circleName, onBack }: { circleName: string; onBack: () => void }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.page}><View style={styles.loadingHeader}><IconButton accessibilityLabel="Go back to circle" onPress={onBack}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>{circleName}</AppText></View><View style={styles.loadingContent}>{[0, 1, 2].map((item) => <View key={item} style={[styles.loadingBubble, item === 1 && styles.loadingBubbleYou]} />)}</View></View>;
}

function MemberAvatar({ member, size }: { member: CircleMember; size: number }) {
  return <DicebearAvatar choice={{ seed: member.avatarSeed, style: member.avatarStyle }} fallback={getInitials(member.displayName)} size={size} />;
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
  headerButton: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }, headerCopy: { flex: 1, minWidth: 0, alignItems: 'center' }, headerSpacer: { height: touchTargets.minimum, width: touchTargets.minimum }, title: { color: colors.ink, fontSize: 19, lineHeight: 23, textAlign: 'center' }, subtitle: { marginTop: 1 },
  messageList: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, emptyMessageList: { justifyContent: 'center' }, dateDivider: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, marginTop: spacing.sm }, dateLine: { backgroundColor: colors.border, flex: 1, height: 1 }, dateLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.1 }, message: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }, messageYou: { justifyContent: 'flex-end' }, messageContent: { maxWidth: '86%' }, messageContentYou: { alignItems: 'flex-end' }, authorName: { color: colors.ink, marginBottom: spacing.xs }, bubble: { maxWidth: '100%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, bubbleOther: { backgroundColor: colors.soft, borderBottomLeftRadius: 6 }, bubbleYou: { backgroundColor: colors.accent, borderBottomRightRadius: 6 }, bubbleError: { borderColor: colors.dangerContent, borderWidth: 1 }, messageBody: { color: colors.ink, fontSize: 15, lineHeight: 21 }, messageBodyYou: { color: colors.onAccent }, bubbleFooter: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'flex-end', marginTop: spacing.xs }, messageTime: { color: colors.muted, fontSize: 11 }, messageTimeYou: { color: colors.onAccent, opacity: 0.82 }, messageStatus: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs }, statusText: { color: colors.accentPressed }, statusTextYou: { color: colors.onAccent }, retryMessage: { justifyContent: 'center', minHeight: 24 },
  olderButton: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md }, olderButtonText: { color: colors.accentPressed, fontSize: 11 }, emptyState: { alignItems: 'center', paddingHorizontal: spacing.xxl }, emptyIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: spacing.md, width: 48 }, emptyTitle: { textAlign: 'center' }, emptyCopy: { lineHeight: 20, marginTop: spacing.xs, textAlign: 'center' }, errorContent: { flex: 1, justifyContent: 'center', padding: spacing.lg }, errorBanner: { alignItems: 'center', backgroundColor: colors.dangerSurface, flexDirection: 'row', gap: spacing.xs, marginHorizontal: spacing.lg, marginBottom: spacing.xs, padding: spacing.sm }, errorText: { flex: 1 }, composer: { alignItems: 'flex-end', backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }, input: { backgroundColor: colors.soft, borderColor: colors.border, borderRadius: 22, borderWidth: 1, color: colors.ink, flex: 1, fontSize: 15, lineHeight: 20, maxHeight: 112, minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, sendButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 }, sendButtonDisabled: { backgroundColor: colors.border }, sendButtonPressed: { opacity: 0.78, transform: [{ scale: 0.96 }] },
  loadingHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, padding: spacing.lg }, loadingContent: { flex: 1, gap: spacing.lg, justifyContent: 'flex-end', padding: spacing.lg }, loadingBubble: { alignSelf: 'flex-start', backgroundColor: colors.borderSubtle, borderRadius: 18, height: 72, width: '68%' }, loadingBubbleYou: { alignSelf: 'flex-end', height: 56, width: '62%' },
}); }
