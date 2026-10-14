import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/auth/auth-provider';
import { AppText, Button, FixedHeaderScreen, IconButton, SegmentedControl, StateCard, Surface } from '@/components/ui';
import type { CircleReportCursor, CircleSafetyReport } from '@/lib/circle-safety';
import { loadCircleReports, reviewCircleReport } from '@/lib/circle-safety';
import { useCircleDetails } from '@/hooks/use-circle-details';
import { spacing } from '@/design-system/tokens';
import { useAppColors } from '@/design-system/use-app-theme';

type ReviewFilter = 'open' | 'reviewed';
type LoadStatus = 'loading' | 'ready' | 'error';
type ReportListState = {
  cursor: CircleReportCursor | null;
  error: string | null;
  hasMore: boolean;
  key: string;
  loadingMore: boolean;
  moreError: string | null;
  reports: CircleSafetyReport[];
  status: LoadStatus;
};

const FILTERS = [
  { label: 'Open', value: 'open' },
  { label: 'Reviewed', value: 'reviewed' },
] as const;

const EMPTY_REPORTS: ReportListState = {
  cursor: null,
  error: null,
  hasMore: false,
  key: '',
  loadingMore: false,
  moreError: null,
  reports: [],
  status: 'loading',
};

export default function CircleReportsRoute() {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { circleId: rawCircleId } = useLocalSearchParams<{ circleId: string }>();
  const circleId = Array.isArray(rawCircleId) ? rawCircleId[0] : rawCircleId;
  const { details, status: circleStatus } = useCircleDetails(circleId);
  const [filter, setFilter] = useState<ReviewFilter>('open');
  const [state, setState] = useState<ReportListState>(EMPTY_REPORTS);
  const [revision, setRevision] = useState(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const canReview = Boolean(details?.members.some((member) => member.userId === user?.uid && (member.role === 'owner' || member.role === 'moderator')));
  const requestKey = `${circleId ?? ''}:${filter}:${revision}`;
  const reportsState = state.key === requestKey ? state : { ...EMPTY_REPORTS, key: requestKey };

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!circleId || circleStatus !== 'ready' || !canReview) return;
    let active = true;
    void loadCircleReports({ circleId, status: filter }).then((page) => {
      if (!active) return;
      setState({
        cursor: page.cursor,
        error: null,
        hasMore: page.hasMore,
        key: requestKey,
        loadingMore: false,
        moreError: null,
        reports: page.reports,
        status: 'ready',
      });
    }).catch(() => {
      if (!active) return;
      setState({ ...EMPTY_REPORTS, error: 'Reports could not load. Check your connection and try again.', key: requestKey, status: 'error' });
    });
    return () => { active = false; };
  }, [canReview, circleId, circleStatus, filter, requestKey]);

  async function loadMore() {
    if (!circleId || !reportsState.cursor || !reportsState.hasMore || reportsState.loadingMore) return;
    setState((previous) => previous.key === requestKey ? { ...previous, loadingMore: true, moreError: null } : previous);
    try {
      const page = await loadCircleReports({ after: reportsState.cursor, circleId, status: filter });
      setState((previous) => previous.key === requestKey ? {
        ...previous,
        cursor: page.cursor,
        hasMore: page.hasMore,
        loadingMore: false,
        reports: [...previous.reports, ...page.reports],
      } : previous);
    } catch {
      setState((previous) => previous.key === requestKey ? {
        ...previous,
        loadingMore: false,
        moreError: 'More reports could not load. Try again.',
      } : previous);
    }
  }

  function confirmReview(report: CircleSafetyReport, disposition: 'resolved' | 'dismissed') {
    const action = disposition === 'resolved' ? 'Resolve' : 'Dismiss';
    Alert.alert(action + ' this report?', 'The decision is saved for the circle’s safety history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: disposition === 'dismissed' ? 'destructive' : 'default', onPress: () => void finishReview(report, disposition) },
    ]);
  }

  async function finishReview(report: CircleSafetyReport, disposition: 'resolved' | 'dismissed') {
    if (!circleId || !user || reviewingId) return;
    setReviewingId(report.id);
    setActionError(null);
    try {
      await reviewCircleReport({ circleId, disposition, reportId: report.id, reviewerId: user.uid });
      setState((previous) => previous.key === requestKey ? {
        ...previous,
        reports: filter === 'open'
          ? previous.reports.filter((item) => item.id !== report.id)
          : previous.reports.map((item) => item.id === report.id ? { ...item, resolvedAt: new Date(), resolvedBy: user.uid, status: disposition } : item),
      } : previous);
    } catch {
      setActionError('That report could not be updated. Check your connection and try again.');
    } finally {
      setReviewingId(null);
    }
  }

  const reportAccessState = circleStatus === 'loading'
    ? 'loading'
    : circleStatus === 'error' || !details
      ? 'unavailable'
      : canReview ? 'ready' : 'denied';

  return (
    <FixedHeaderScreen
      backgroundColor={colors.background}
      contentContainerStyle={styles.content}
      header={<View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}><Ionicons color={colors.ink} name="chevron-back" size={22} /></IconButton>
        <View style={styles.headerCopy}>
          <AppText accessibilityRole="header" style={styles.title} variant="titleSmall">Safety reports</AppText>
          <AppText numberOfLines={1} tone="secondary" variant="caption">{details?.circle.name ?? 'Circle'}</AppText>
        </View>
        <IconButton accessibilityLabel="Refresh reports" onPress={refresh}><Ionicons color={colors.accentPressed} name="refresh" size={19} /></IconButton>
      </View>}
      headerStyle={styles.headerContainer}
    >
      {reportAccessState === 'loading' ? <StateCard description="Checking your circle role." title="Loading reports" /> : reportAccessState === 'unavailable' ? (
        <StateCard actionLabel="Back" description="This circle could not be loaded." onAction={() => router.back()} title="Reports unavailable" tone="error" />
      ) : reportAccessState === 'denied' ? (
        <StateCard description="Only this circle’s owner and moderators can review safety reports." title="You can’t review these reports" />
      ) : <>
        <SegmentedControl accessibilityLabel="Report status" items={FILTERS} onChange={setFilter} value={filter} variant="surface" />
        {reportsState.status === 'loading' ? <StateCard description="Loading the latest reports." title="Loading reports" /> : reportsState.status === 'error' ? (
          <StateCard actionLabel="Try again" description={reportsState.error ?? 'Reports could not load.'} onAction={refresh} title="Could not load reports" tone="error" />
        ) : reportsState.reports.length === 0 ? (
          <StateCard
            description={filter === 'open' ? 'New reports from circle members will appear here.' : 'Reports you resolve or dismiss will be kept here.'}
            title={filter === 'open' ? 'No open reports' : 'No reviewed reports yet'}
            tone="empty"
          />
        ) : <View style={styles.reportList}>
          {reportsState.reports.map((report) => <ReportCard
            key={report.id}
            busy={reviewingId === report.id}
            filter={filter}
            onDismiss={() => confirmReview(report, 'dismissed')}
            onResolve={() => confirmReview(report, 'resolved')}
            report={report}
          />)}
          {reportsState.hasMore ? <Button loading={reportsState.loadingMore} onPress={() => void loadMore()} size="medium" variant="tertiary">Load more reports</Button> : null}
        </View>}
        {reportsState.moreError ? <View style={styles.retryRow}><AppText accessibilityLiveRegion="polite" style={styles.errorText} tone="danger" variant="caption">{reportsState.moreError}</AppText><Button onPress={() => void loadMore()} size="small" variant="tertiary">Retry</Button></View> : null}
        {actionError ? <AppText accessibilityLiveRegion="polite" tone="danger" variant="caption">{actionError}</AppText> : null}
      </>}
    </FixedHeaderScreen>
  );
}

function ReportCard({ busy, filter, onDismiss, onResolve, report }: {
  busy: boolean;
  filter: ReviewFilter;
  onDismiss: () => void;
  onResolve: () => void;
  report: CircleSafetyReport;
}) {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Surface padding="lg" radius="lg" style={styles.reportCard} variant="outline">
    <View style={styles.reportHeading}>
      <View style={styles.reportIcon}><Ionicons color={colors.dangerContent} name="flag-outline" size={18} /></View>
      <View style={styles.reportTitleBlock}>
        <AppText style={styles.reportTitle} variant="label">{report.targetLabel}</AppText>
        <AppText tone="secondary" variant="caption">{targetKind(report.targetType)} · {REASON_LABELS[report.reason]}</AppText>
      </View>
    </View>
    {report.targetPreview ? <AppText selectable style={styles.preview} variant="bodySmall">{report.targetPreview}</AppText> : null}
    {report.details ? <AppText tone="secondary" variant="bodySmall">{report.details}</AppText> : null}
    <AppText tone="tertiary" variant="caption">{formatReportDate(report.createdAt)}</AppText>
    {filter === 'open' ? <>
      <Button disabled={busy} loading={busy} onPress={onResolve} size="medium" variant="primary">Resolve report</Button>
      <Button disabled={busy} onPress={onDismiss} size="medium" variant="danger">Dismiss report</Button>
    </> : <AppText tone="secondary" variant="caption">{report.status === 'resolved' ? 'Resolved' : 'Dismissed'} · {report.resolution ?? 'Reviewed by moderators.'}</AppText>}
  </Surface>;
}

const REASON_LABELS = {
  spam: 'Spam or misleading',
  harassment: 'Harassment or bullying',
  unsafe: 'Unsafe behaviour',
  privacy: 'Privacy concern',
  other: 'Something else',
} as const;

function targetKind(type: string) {
  if (type === 'message') return 'Message';
  if (type === 'circle') return 'Circle';
  return 'Member';
}

function formatReportDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Date unavailable';
}

function createStyles(colors: ReturnType<typeof useAppColors>) { return StyleSheet.create({
  headerContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  headerCopy: { alignItems: 'center', flex: 1, minWidth: 0 },
  title: { color: colors.ink },
  content: { gap: spacing.lg, padding: spacing.xl, paddingBottom: spacing.xxxl },
  reportList: { gap: spacing.md },
  reportCard: { gap: spacing.md },
  reportHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  reportIcon: { alignItems: 'center', backgroundColor: colors.dangerSurface, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  reportTitleBlock: { flex: 1, gap: 2, minWidth: 0 },
  reportTitle: { color: colors.ink },
  preview: { backgroundColor: colors.subtleSurface, borderRadius: 12, color: colors.ink, padding: spacing.md },
  retryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  errorText: { flex: 1 },
}); }
