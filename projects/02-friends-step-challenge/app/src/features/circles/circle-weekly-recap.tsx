import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';

import { AppText, StateCard, Surface } from '@/components/ui';
import { getDateKeyDaysBefore, getDateKeyInTimeZone, getWeekStartKey } from '@/domain/dates';
import { useAppColors } from '@/design-system/use-app-theme';
import type { Circle, CircleMember } from '@/lib/circles';
import { database, requireFirebase } from '@/lib/firebase';

type RecapTopWalker = { userId: string; displayName: string; rank: number; verifiedSteps: number };
type CircleRecap = { weekKey: string; totalVerifiedSteps: number; participationCount: number; winnerUserId: string | null; topWalkers: RecapTopWalker[] };
type RecapState = { key: string; recap: CircleRecap | null; status: 'loading' | 'ready' | 'error' };

export function CircleWeeklyRecap({ circle, members }: { circle: Circle; members: CircleMember[] }) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentDateKey = getDateKeyInTimeZone(new Date(), circle.competitionTimeZone);
  const recapWeekKey = getWeekStartKey(getDateKeyDaysBefore(new Date(`${currentDateKey}T12:00:00.000Z`), 'UTC', 7));
  const key = `${circle.id}:${recapWeekKey}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<RecapState>({ key: '', recap: null, status: 'loading' });
  const current = state.key === key ? state : { key, recap: null, status: 'loading' as const };

  useEffect(() => {
    const db = requireFirebase(database, 'Firestore');
    return onSnapshot(doc(db, 'circles', circle.id, 'weeklyRecaps', recapWeekKey), (snapshot) => {
      if (!snapshot.exists()) {
        setState({ key, recap: null, status: 'ready' });
        return;
      }
      const data = snapshot.data();
      if (typeof data.totalVerifiedSteps !== 'number' || typeof data.participationCount !== 'number') {
        setState({ key, recap: null, status: 'error' });
        return;
      }
      const topWalkers = Array.isArray(data.topWalkers) ? data.topWalkers.flatMap((walker: unknown) => {
        if (!walker || typeof walker !== 'object') return [];
        const value = walker as Record<string, unknown>;
        return typeof value.userId === 'string' && typeof value.displayName === 'string' && typeof value.rank === 'number' && typeof value.verifiedSteps === 'number'
          ? [{ userId: value.userId, displayName: value.displayName, rank: value.rank, verifiedSteps: value.verifiedSteps }]
          : [];
      }) : [];
      setState({ key, status: 'ready', recap: {
        participationCount: data.participationCount,
        totalVerifiedSteps: data.totalVerifiedSteps,
        weekKey: typeof data.weekKey === 'string' ? data.weekKey : recapWeekKey,
        winnerUserId: typeof data.winnerUserId === 'string' ? data.winnerUserId : null,
        topWalkers,
      } });
    }, () => setState({ key, recap: null, status: 'error' }));
  }, [circle.id, key, recapWeekKey, revision]);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  if (current.status === 'loading') return <Surface padding="lg" radius="lg"><AppText tone="secondary">Loading last week’s recap…</AppText></Surface>;
  if (current.status === 'error') return <StateCard tone="error" title="Weekly recap unavailable" description="We could not load your circle’s last weekly result." actionLabel="Try again" onAction={retry} />;
  if (!current.recap) return <Surface padding="lg" radius="lg" style={styles.empty}><AppText variant="label">Last week’s recap</AppText><AppText tone="secondary" variant="bodySmall">Your first recap will appear after a full competition week has finished.</AppText></Surface>;

  const recap = current.recap;
  const winner = members.find((member) => member.userId === recap.winnerUserId)?.displayName ?? recap.topWalkers[0]?.displayName;
  const weekLabel = formatWeek(recap.weekKey);
  return <Surface padding="lg" radius="lg" style={styles.card}>
    <View style={styles.heading}><View style={styles.headingCopy}><AppText variant="label">Last week’s recap</AppText><AppText tone="secondary" variant="caption">{weekLabel}</AppText></View><View style={styles.trophy}><AppText style={styles.trophyText}>★</AppText></View></View>
    <View style={styles.stats}><View style={styles.stat}><AppText variant="titleSmall">{formatSteps(recap.totalVerifiedSteps)}</AppText><AppText tone="secondary" variant="caption">circle steps</AppText></View><View style={styles.stat}><AppText variant="titleSmall">{recap.participationCount}</AppText><AppText tone="secondary" variant="caption">walkers</AppText></View></View>
    {winner ? <AppText variant="bodySmall">Top walker · <AppText style={styles.winner}>{winner}</AppText></AppText> : <AppText tone="secondary" variant="bodySmall">Your circle is ready for its first steps.</AppText>}
    {recap.topWalkers.slice(0, 3).map((walker) => <View key={walker.userId} style={styles.walker}><AppText variant="label" style={styles.rank}>#{walker.rank}</AppText><AppText numberOfLines={1} style={styles.walkerName}>{walker.displayName}</AppText><AppText variant="label">{formatSteps(walker.verifiedSteps)}</AppText></View>)}
    {recap.topWalkers.length === 0 && recap.winnerUserId ? <AppText tone="secondary" variant="caption">Your weekly standings are saved.</AppText> : null}
  </Surface>;
}

function formatWeek(weekKey: string) {
  const [year, month, day] = weekKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function formatSteps(value: number) { return Math.max(0, Math.floor(value)).toLocaleString(); }

function createStyles(colors: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    card: { gap: 12 },
    empty: { gap: 6 },
    heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    headingCopy: { gap: 3 },
    trophy: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
    trophyText: { color: colors.accentPressed, fontSize: 22 },
    stats: { flexDirection: 'row', gap: 12 },
    stat: { backgroundColor: colors.soft, borderRadius: 14, flex: 1, gap: 3, padding: 12 },
    winner: { color: colors.accentPressed, fontWeight: '800' },
    walker: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 10 },
    rank: { color: colors.accentPressed, width: 32 },
    walkerName: { color: colors.ink, flex: 1, fontSize: 14 },
  });
}
