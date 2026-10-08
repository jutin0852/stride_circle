import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { PlannedWalk, WalkActivity } from '@/domain/walk';
import { hydratePlannedWalks, listLocalWalks, listPlannedWalks, subscribeWalks, syncPendingWalks } from '@/services/walks/repository';

export function useWalks(userId?: string) {
  const revision = useRef(0);
  const [state, setState] = useState<{ userId?: string; activities: WalkActivity[]; routes: PlannedWalk[]; loading: boolean; error: boolean }>({ activities: [], routes: [], loading: true, error: false });
  const refresh = useCallback(async () => {
    if (!userId) return;
    const request = ++revision.current;
    try {
      const [activities, routes] = await Promise.all([listLocalWalks(userId), listPlannedWalks(userId)]);
      if (request === revision.current) setState({ userId, activities, routes, loading: false, error: false });
    } catch { if (request === revision.current) setState({ userId, activities: [], routes: [], loading: false, error: true }); }
  }, [userId]);
  useEffect(() => {
    let active = true;
    const update = () => { if (active) void refresh(); };
    update();
    const sync = () => { if (userId) void syncPendingWalks(userId).then(() => hydratePlannedWalks(userId)).catch(() => {}); };
    sync();
    const retry = setInterval(sync, 60000);
    const unsubscribe = subscribeWalks(update);
    const listener = AppState.addEventListener('change', s => { if (s === 'active') { update(); sync(); } });
    return () => { active = false; revision.current++; clearInterval(retry); unsubscribe(); listener.remove(); };
  }, [refresh, userId]);
  return state.userId === userId ? { ...state, refresh } : { activities: [], routes: [], loading: Boolean(userId), error: false, refresh };
}
