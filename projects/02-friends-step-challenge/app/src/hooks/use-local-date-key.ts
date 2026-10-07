import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getLocalDateKey } from '@/lib/daily-steps';

/** Re-render date-dependent screens at midnight and after returning to the app. */
export function useLocalDateKey() {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(() => { setDateKey(getLocalDateKey()); schedule(); }, midnight.getTime() - now.getTime());
    };
    schedule();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      clearTimeout(timer);
      setDateKey(getLocalDateKey());
      schedule();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return dateKey;
}
