import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export interface JournalEntry {
  id: string;
  text: string;
  fromUid: string;
  createdAt: number;
  updatedAt?: number;
  // Optional emotional tag — picked from a small set
  mood?: 'reflective' | 'happy' | 'grateful' | 'frustrated' | 'tender' | 'curious';
}

export function subscribeJournal(
  coupleId: string,
  onChange: (entries: JournalEntry[]) => void,
): Unsubscribe {
  // Cap at 100 most recent — older entries can be paginated later if needed
  const q = query(
    collection(db, 'couples', coupleId, 'journal'),
    orderBy('createdAt', 'desc'),
    limit(100),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as JournalEntry)));
  });
}

export async function addJournalEntry(
  coupleId: string,
  fromUid: string,
  text: string,
  mood?: JournalEntry['mood'],
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'journal'), {
    text,
    fromUid,
    createdAt: Date.now(),
    ...(mood ? { mood } : {}),
  });
}

export async function updateJournalEntry(
  coupleId: string,
  entryId: string,
  text: string,
  mood?: JournalEntry['mood'],
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'journal', entryId), {
    text,
    updatedAt: Date.now(),
    ...(mood ? { mood } : {}),
  });
}

export async function deleteJournalEntry(coupleId: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'journal', entryId));
}
