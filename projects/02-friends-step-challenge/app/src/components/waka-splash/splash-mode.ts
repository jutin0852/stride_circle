import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * full: the running animation (first launch of each local day).
 * short: the logo settles in and hands off quickly (every other launch).
 */
export type SplashMode = 'full' | 'short';

const LAST_FULL_SPLASH_KEY = 'waka:splash:last-full-date';

export function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function chooseSplashMode(lastFullDate: string | null, today: string): SplashMode {
  return lastFullDate === today ? 'short' : 'full';
}

/**
 * Decides which splash to play. Returns null while the local marker is read (the splash shows
 * its plain background meanwhile). The marker records a viewed animation, not product data,
 * so it stays on the device. If storage fails, the short splash is the safe default.
 */
export function useSplashMode(now: () => Date = () => new Date()) {
  const [mode, setMode] = useState<SplashMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = localDateKey(now());

    void AsyncStorage.getItem(LAST_FULL_SPLASH_KEY)
      .then((lastFullDate) => {
        const next = chooseSplashMode(lastFullDate, today);
        if (!cancelled) setMode(next);
        if (next === 'full') return AsyncStorage.setItem(LAST_FULL_SPLASH_KEY, today);
      })
      .catch(() => {
        if (!cancelled) setMode('short');
      });

    return () => {
      cancelled = true;
    };
    // Decided once per app launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return mode;
}
