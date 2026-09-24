import { useEffect, useRef, useState } from 'react';

import { saveCircleDailySteps } from '@/lib/circles';
import { loadDailySteps, saveDailySteps } from '@/lib/daily-steps';

type DailyStepSyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useDailyStepRecord(input: {
  circleId: string | undefined;
  shouldSave: boolean;
  steps: number;
  userId: string | undefined;
}) {
  const [savedSteps, setSavedSteps] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<DailyStepSyncStatus>('idle');
  const latestSyncKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = input.userId;
    if (!userId) return;

    let cancelled = false;
    void loadDailySteps(userId)
      .then((steps) => {
        if (cancelled) return;

        setSavedSteps(steps);
        setSyncStatus('idle');
      })
      .catch(() => {
        if (!cancelled) setSyncStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [input.userId]);

  useEffect(() => {
    const userId = input.userId;
    if (!userId || !input.shouldSave) return;
    const syncKey = `${input.circleId ?? 'private'}:${input.steps}`;
    if (latestSyncKeyRef.current === syncKey) return;

    const timeout = setTimeout(() => {
      setSyncStatus('saving');

      void saveDailySteps({ steps: input.steps, userId })
        .then(() => {
          if (!input.circleId) return;
          return saveCircleDailySteps({
            circleId: input.circleId,
            steps: input.steps,
            userId,
          });
        })
        .then(() => {
          latestSyncKeyRef.current = syncKey;
          setSavedSteps(input.steps);
          setSyncStatus('saved');
        })
        .catch(() => setSyncStatus('error'));
    }, 15_000);

    return () => clearTimeout(timeout);
  }, [input.circleId, input.shouldSave, input.steps, input.userId]);

  return { savedSteps, syncStatus };
}
