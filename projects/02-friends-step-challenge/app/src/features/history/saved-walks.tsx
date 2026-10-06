import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { AppText, Button, StateCard } from '@/components/ui';
import { radii, semanticColors as colors, spacing } from '@/design-system/tokens';
import { dateFromKey } from '@/domain/walking-history';
import type { ActivityRecord } from '@/lib/activities';
import type { HistoryLoadState } from './use-walking-history';
import { historyColors } from './history-tokens';

export function SavedWalks({ records, status, onOpen, onRetry }: { records: ActivityRecord[]; status: HistoryLoadState; onOpen: (id: string) => void; onRetry: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const walks = records.filter((record) => record.activityType === 'walk');
  return <View style={styles.section}>
    <View style={styles.sectionHead}><AppText accessibilityRole="header" variant="titleSmall" style={styles.title}>Saved walks</AppText><AppText variant="label" tone="secondary">{walks.length} {walks.length === 1 ? 'walk' : 'walks'}</AppText></View>
    {status === 'loading' ? <Skeleton style={{ width: '100%', height: 140, borderRadius: radii.xl, backgroundColor: '#DCEEF3' }} /> : status === 'error' ? <StateCard tone="error" title="Walks couldn’t load" description="Your daily steps are separate from recorded walks." actionLabel="Try again" onAction={onRetry} /> : !walks.length ? <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="footsteps-outline" size={24} color={historyColors.blueDeep} /></View><AppText variant="titleSmall" style={styles.emptyTitle}>A story waiting to be walked</AppText><AppText variant="bodySmall" tone="secondary">Walks you finish and save in the Walk tab appear here. Your daily steps still count without recording a walk.</AppText></View> : <View style={styles.list}>
      {(expanded ? walks : walks.slice(0, 5)).map((walk, index) => <Pressable key={walk.id} accessibilityRole="button" accessibilityLabel={`Walk on ${new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(dateFromKey(walk.dateKey))}, ${(walk.distanceMeters / 1000).toFixed(2)} kilometers`} accessibilityHint="Opens your private saved walk summary" onPress={() => onOpen(walk.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={[styles.icon, index % 2 === 0 ? styles.iconCoral : styles.iconBlue]}><Ionicons name={index % 2 === 0 ? 'footsteps' : 'bookmark'} size={21} color={colors.contentPrimary} /></View>
        <View style={styles.copy}><AppText variant="label">Walk on {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', weekday: 'short' }).format(dateFromKey(walk.dateKey))}</AppText><AppText variant="bodySmall" tone="secondary">{formatElapsed(walk.durationMs)} · {(walk.distanceMeters / 1000).toFixed(2)} km{walk.route.length > 1 ? ' · Private route' : ''}</AppText></View>
        <Ionicons name="chevron-forward" size={18} color={historyColors.blueDeep} />
      </Pressable>)}
      {walks.length > 5 ? <View style={styles.more}><Button size="small" variant="tertiary" onPress={() => setExpanded((value) => !value)}>{expanded ? 'Show fewer walks' : `View ${walks.length} recent walks`}</Button></View> : null}
    </View>}
  </View>;
}

function formatElapsed(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}

const styles = StyleSheet.create({
  section: { gap: spacing.md, marginTop: spacing.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  title: { color: historyColors.ink },
  list: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: 2, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: historyColors.line, minHeight: 68, flexWrap: 'wrap' },
  icon: { borderColor: 'transparent', borderWidth: 1, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, iconCoral: { backgroundColor: historyColors.coralPale }, iconBlue: { backgroundColor: '#EDF8FC' },
  copy: { flex: 1, minWidth: 115, gap: spacing.xs }, more: { padding: spacing.md }, pressed: { backgroundColor: '#EDF8FC' },
  emptyState: { paddingVertical: spacing.xs, gap: spacing.xs, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  emptyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: historyColors.ice, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: historyColors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600', flex: 1 },
});
