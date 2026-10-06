import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { database, requireFirebase } from '@/lib/firebase';

/** Existing rules enforce membership, immutable cheers, and blocks in both directions. */
export function useHomeCheer(userId: string | undefined, circleId: string | undefined, recipientId: string | undefined, dateKey: string) {
  const [blocked, setBlocked] = useState<{ userId: string; ids: string[] } | null>(null);
  const key = userId && circleId && recipientId ? encodeURIComponent(JSON.stringify([userId, recipientId, dateKey, 'nice_work'])) : null;
  const scope = `${circleId ?? ''}:${key ?? ''}`;
  const currentScope = useRef(scope);
  useEffect(() => { currentScope.current = scope; }, [scope]);
  const pending = useRef<string | null>(null);
  const [state, setState] = useState<{ scope: string; status: 'loading' | 'idle' | 'sending' | 'sent' | 'error' }>({ scope: '', status: 'loading' });
  useEffect(() => {
    if (!userId) return;
    return onSnapshot(collection(requireFirebase(database, 'Firestore'), 'users', userId, 'blocks'),
      (snapshot) => setBlocked({ userId, ids: snapshot.docs.map((record) => record.id) }),
      () => setBlocked({ userId, ids: ['*'] }));
  }, [userId]);
  useEffect(() => {
    if (!circleId || !key) return;
    return onSnapshot(doc(requireFirebase(database, 'Firestore'), 'circles', circleId, 'cheers', key),
      (snapshot) => setState((current) => ({ scope, status: snapshot.exists() && !snapshot.metadata.hasPendingWrites ? 'sent' : current.scope === scope && current.status === 'sending' ? 'sending' : 'idle' })),
      () => setState({ scope, status: 'error' }));
  }, [circleId, key, scope]);
  const send = useCallback(async () => {
    if (!userId || !circleId || !recipientId || !key || pending.current === scope || (state.scope === scope && state.status === 'sent')) return;
    pending.current = scope; setState({ scope, status: 'sending' });
    try {
      const db = requireFirebase(database, 'Firestore');
      const reference = doc(db, 'circles', circleId, 'cheers', key);
      await runTransaction(db, async (transaction) => {
        if ((await transaction.get(reference)).exists()) return;
        transaction.set(reference, { circleId, senderId: userId, recipientId, dateKey, cheerType: 'nice_work', createdAt: serverTimestamp() });
      });
      if (currentScope.current === scope) setState({ scope, status: 'sent' });
    } catch {
      if (currentScope.current === scope) setState({ scope, status: 'error' });
    } finally { if (pending.current === scope) pending.current = null; }
  }, [circleId, dateKey, key, recipientId, scope, state.scope, state.status, userId]);
  return { status: state.scope === scope ? state.status : 'loading' as const, send, blockedIds: blocked && blocked.userId === userId ? blocked.ids : ['*'] };
}
