import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { dateFromKey, localDateKey, monthRange, shiftMonth } from '@/domain/walking-history';
import { useActivityHistory } from '@/hooks/use-activity-history';
import { useDailyStepGoal } from '@/hooks/use-daily-step-goal';
import { getStreakSummary } from '@/lib/streaks';
import { HistoryView } from './history-view';
import { useWalkingHistory } from './use-walking-history';

export function HistoryScreen({ userId, onOpenWalk }: { userId: string | undefined; onOpenWalk: (id: string) => void }) {
  const today = useLocalToday();
  const [browsedMonth, setBrowsedMonth] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const month = browsedMonth ?? monthRange(today).from;
  const overview = useWalkingHistory(userId, null);
  const calendar = useWalkingHistory(userId, month);
  const goal = useDailyStepGoal(userId);
  const walks = useActivityHistory(userId);
  const summary = useMemo(() => getStreakSummary({ goal: goal.goal, records: overview.records, todaySteps: 0, now: dateFromKey(today) }), [goal.goal, overview.records, today]);

  function refresh() {
    overview.refresh(); calendar.refresh(); goal.refresh(); walks.refresh();
  }

  function changeMonth(offset: number) {
    const next = shiftMonth(month, offset);
    if (next > monthRange(today).from) return;
    setBrowsedMonth(next);
    setSelectedDay(next === monthRange(today).from ? today : next);
  }

  return <HistoryView today={today} month={month} selected={selectedDay ?? today} summary={summary} overview={overview} calendar={calendar} goal={goal} walks={walks} refreshing={overview.refreshing} onRefresh={refresh} onMonthChange={changeMonth} onSelect={setSelectedDay} onOpenWalk={onOpenWalk} />;
}

function useLocalToday() {
  const [today, setToday] = useState(() => localDateKey());
  useEffect(() => {
    const update = () => setToday(localDateKey());
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    const timer = setInterval(update, 60_000);
    return () => { listener.remove(); clearInterval(timer); };
  }, []);
  return today;
}
