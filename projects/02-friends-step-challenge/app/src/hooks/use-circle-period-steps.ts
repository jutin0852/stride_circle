import { useEffect, useState } from 'react';

import { getCircleDailyStepsForDates, type CircleDailySteps, watchCircleDailyStepsForDates } from '@/lib/circles';

type PeriodStepsState = {
  key: string;
  status: 'loading' | 'ready' | 'error';
  stepsByDate: Record<string, CircleDailySteps>;
};

export function useCirclePeriodSteps(circleId: string | undefined, dateKeys: readonly string[], liveDateKeys: readonly string[] = []) {
  const dateSignature = dateKeys.join('|');
  const liveDateSignature = liveDateKeys.join('|');
  const key = `${circleId ?? ''}:${dateSignature}`;
  const [state, setState] = useState<PeriodStepsState>({ key: '', status: 'loading', stepsByDate: {} });
  const current = state.key === key
    ? state
    : !circleId || dateKeys.length === 0
      ? { key, status: 'ready' as const, stepsByDate: {} }
      : { key, status: 'loading' as const, stepsByDate: {} };

  useEffect(() => {
    if (!circleId || dateKeys.length === 0) {
      return;
    }

    let liveReady = liveDateKeys.length === 0;
    let historicalReady = dateKeys.every((dateKey) => liveDateKeys.includes(dateKey));
    let active = true;

    const publish = (stepsByDate: Record<string, CircleDailySteps>, status: PeriodStepsState['status'] = liveReady && historicalReady ? 'ready' : 'loading') => {
      if (active) setState((current) => ({ key, status, stepsByDate: { ...(current.key === key ? current.stepsByDate : {}), ...stepsByDate } }));
    };

    const unsubscribe = liveDateKeys.length > 0 ? watchCircleDailyStepsForDates(
      circleId,
      liveDateKeys,
      (stepsByDate) => {
        liveReady = true;
        publish(stepsByDate);
      },
      () => publish({}, 'error'),
    ) : () => {};

    const historicalDateKeys = dateKeys.filter((dateKey) => !liveDateKeys.includes(dateKey));
    void getCircleDailyStepsForDates(circleId, historicalDateKeys)
      .then((stepsByDate) => {
        historicalReady = true;
        publish(stepsByDate);
      })
      .catch(() => publish({}, 'error'));

    return () => {
      active = false;
      unsubscribe();
    };
    // The signature keeps the listener stable while allowing period dates to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, dateSignature, liveDateSignature]);

  return current;
}
