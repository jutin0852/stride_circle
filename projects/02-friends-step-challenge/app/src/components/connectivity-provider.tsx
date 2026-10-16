import { useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

import { ConnectivityContext } from '@/hooks/use-connectivity';
import { database } from '@/lib/firebase';

// Brief cache-only moments (start-up, a quick network blip) should not flash
// an offline banner, so offline is declared only after this long.
export const OFFLINE_DELAY_MS = 4000;

/**
 * Detects being offline without a native network module: Firestore marks a
 * snapshot `fromCache` while it cannot reach the server. The signed-in user's
 * profile document is already watched elsewhere, so this listener adds no
 * extra reads.
 */
export function ConnectivityProvider({ children, userId }: { children: ReactNode; userId: string | undefined }) {
  const [offlineFor, setOfflineFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !database) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const startOfflineTimer = () => {
      if (!timer) timer = setTimeout(() => setOfflineFor(userId), OFFLINE_DELAY_MS);
    };
    const markOnline = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      setOfflineFor(null);
    };

    // No server answer yet counts as possibly offline until one arrives.
    startOfflineTimer();
    const stop = onSnapshot(
      doc(database, 'users', userId),
      { includeMetadataChanges: true },
      (snapshot) => { if (snapshot.metadata.fromCache) startOfflineTimer(); else markOnline(); },
      () => undefined,
    );
    return () => {
      if (timer) clearTimeout(timer);
      stop();
    };
  }, [userId]);

  return <ConnectivityContext.Provider value={{ offline: Boolean(userId) && offlineFor === userId }}>{children}</ConnectivityContext.Provider>;
}
