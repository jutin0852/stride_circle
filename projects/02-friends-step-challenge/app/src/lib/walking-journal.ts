import { deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';

import { database, requireFirebase } from '@/lib/firebase';
import { isValidDateKey } from '@/domain/walking-history';

export type WalkingJournalEntry = { dateKey: string; note: string };

function getJournalReference(userId: string, dateKey: string) {
  const db = requireFirebase(database, 'Firestore');
  return doc(db, 'users', userId, 'walkingJournal', dateKey);
}

export function watchWalkingJournalEntry(
  userId: string,
  dateKey: string,
  onChange: (entry: WalkingJournalEntry | null) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(getJournalReference(userId, dateKey), (snapshot) => {
    const data = snapshot.data();
    const note = data?.note;
    onChange(
      typeof note === 'string' && note.length <= 500
        ? { dateKey, note }
        : null,
    );
  }, onError);
}

export async function saveWalkingJournalEntry(input: { dateKey: string; note: string; userId: string }) {
  if (!isValidDateKey(input.dateKey)) throw new Error('Choose a valid History date.');
  const note = input.note.trim();
  const reference = getJournalReference(input.userId, input.dateKey);
  const db = requireFirebase(database, 'Firestore');

  if (!note) {
    await deleteDoc(reference);
    return;
  }
  if (note.length > 500) throw new Error('A walking note can be up to 500 characters.');

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference);
    transaction.set(reference, {
      createdAt: existing.data()?.createdAt ?? serverTimestamp(),
      dateKey: input.dateKey,
      note,
      schemaVersion: 1,
      updatedAt: serverTimestamp(),
    });
  });
}
