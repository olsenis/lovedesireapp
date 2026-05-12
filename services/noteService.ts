import { collection, addDoc, updateDoc, doc, onSnapshot, orderBy, query, where, getDocs, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface LoveNote {
  id: string;
  message: string;
  openAt: number;
  openCondition?: 'sad'; // if set, only unlocks when partner logs sad mood
  fromUid: string;
  opened: boolean;
  createdAt: number;
}

export function subscribeNotes(coupleId: string, onChange: (notes: LoveNote[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'notes'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LoveNote)));
  });
}

export async function createNote(
  coupleId: string,
  fromUid: string,
  message: string,
  openAt: number,
  openCondition?: 'sad'
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'notes'), {
    message,
    // If condition-based, set openAt far in future so time-check never triggers it
    openAt: openCondition === 'sad' ? 32503680000000 : openAt,
    ...(openCondition ? { openCondition } : {}),
    fromUid,
    opened: false,
    createdAt: Date.now(),
  });
}

// Called when a user sets their mood to sad — unlocks any pending sad-condition notes from partner
export async function unlockSadNotes(coupleId: string, uid: string): Promise<void> {
  const q = query(
    collection(db, 'couples', coupleId, 'notes'),
    where('openCondition', '==', 'sad'),
    where('opened', '==', false)
  );
  const snap = await getDocs(q);
  const toUnlock = snap.docs.filter(d => d.data().fromUid !== uid);
  await Promise.all(toUnlock.map(d =>
    updateDoc(d.ref, { openAt: Date.now() })
  ));
}

export async function openNote(coupleId: string, noteId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'notes', noteId), { opened: true });
}
