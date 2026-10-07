import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';

import { useAuth } from '@/auth/auth-provider';
import { useCurrentCircle } from '@/hooks/use-current-circle';
import {
  createCircle,
  getCircleHubPreview,
  joinCircle,
  joinPublicCircle,
  watchPublicCircles,
  type CircleHubPreview,
  type PublicCircleSummary,
} from '@/lib/circles';
import { CirclesView } from '@/features/circles/circles-view';
import type { CircleVisibility } from '@/domain/circles';

export default function CirclesRoute() {
  const { user } = useAuth();
  const { circles, status, refresh } = useCurrentCircle(user?.uid);
  const [publicCircles, setPublicCircles] = useState<PublicCircleSummary[]>([]);
  const [publicCircleStatus, setPublicCircleStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [publicRevision, setPublicRevision] = useState(0);
  const [previewState, setPreviewState] = useState<{ key: string; previews: Record<string, CircleHubPreview> }>({ key: '', previews: {} });
  const [busyCircleId, setBusyCircleId] = useState<string | null>(null);
  const circleIdsKey = JSON.stringify(circles.map((circle) => circle.id));
  const previewKey = `${user?.uid ?? ''}:${circleIdsKey}`;
  const previews = previewState.key === previewKey ? previewState.previews : {};

  useFocusEffect(useCallback(() => {
    // This value intentionally re-creates the subscription after a retry.
    void publicRevision;
    return watchPublicCircles(
      (nextCircles) => {
        setPublicCircles(nextCircles);
        setPublicCircleStatus('ready');
      },
      () => setPublicCircleStatus('error'),
    );
  }, [publicRevision]));

  useFocusEffect(useCallback(() => {
    let active = true;
    const circleIds = JSON.parse(circleIdsKey) as string[];

    if (status !== 'ready' || circleIds.length === 0) return () => { active = false; };

    void Promise.all(circleIds.map(async (circleId) => {
      try {
        const preview = await getCircleHubPreview(circleId);
        return preview ? [circleId, preview] as const : null;
      } catch {
        return null;
      }
    })).then((results) => {
      if (!active) return;
      setPreviewState({
        key: previewKey,
        previews: Object.fromEntries(results.filter((result): result is NonNullable<typeof result> => result !== null)),
      });
    });

    return () => { active = false; };
  }, [circleIdsKey, previewKey, status]));

  async function handleCreate(input: { name: string; discoverableArea: string; visibility: CircleVisibility }) {
    if (!user) return 'Please sign in before creating a circle.';
    try {
      const circleId = await createCircle({ activityType: 'walk', ...input, user });
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
      return null;
    } catch (error) {
      return getMessage(error);
    }
  }

  async function handleJoinInvite(inviteCode: string) {
    if (!user) return 'Please sign in before joining a circle.';
    const circleId = inviteCode.trim().toUpperCase().replace(/\s/g, '');
    try {
      await joinCircle({ inviteCode, user });
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
      return null;
    } catch (error) {
      return getMessage(error);
    }
  }

  async function handleJoinPublic(circleId: string) {
    if (!user) return 'Please sign in before joining a circle.';
    setBusyCircleId(circleId);
    try {
      await joinPublicCircle({ circleId, user });
      router.push({ pathname: '/circle/[circleId]', params: { circleId } });
      return null;
    } catch (error) {
      return getMessage(error);
    } finally {
      setBusyCircleId(null);
    }
  }

  return (
    <CirclesView
      busyCircleId={busyCircleId}
      circleStatus={status}
      circles={circles}
      onCreate={handleCreate}
      onJoinInvite={handleJoinInvite}
      onJoinPublic={handleJoinPublic}
      onOpenCircle={(circleId) => router.push({ pathname: '/circle/[circleId]', params: { circleId } })}
      onRetryCircles={refresh}
      onRetryPublic={() => {
        setPublicCircleStatus('loading');
        setPublicRevision((revision) => revision + 1);
      }}
      previews={previews}
      publicCircles={publicCircles}
      publicStatus={publicCircleStatus}
    />
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
