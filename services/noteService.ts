import { collection, addDoc, updateDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface LoveNote {
  id: string;
  message: string;
  openAt: number; // timestamp — when the note can be opened
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
  openAt: number
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'notes'), {
    message,
    openAt,
    fromUid,
    opened: false,
    createdAt: Date.now(),
  });
}

export async function openNote(coupleId: string, noteId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'notes', noteId), { opened: true });
}
