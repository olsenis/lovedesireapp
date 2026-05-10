import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface Memory {
  id: string;
  photoURL: string;
  caption: string;
  createdBy: string;
  createdAt: number;
  memoryDate?: string;           // human-readable: "Summer 2023", "10 May 2019"
  reactions?: Record<string, string>; // uid -> emoji
}

export function subscribeMemories(coupleId: string, onChange: (memories: Memory[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'memories'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory)));
  });
}

export async function addMemory(
  coupleId: string,
  photoURL: string,
  caption: string,
  createdBy: string,
  memoryDate?: string
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'memories'), {
    photoURL,
    caption,
    createdBy,
    createdAt: Date.now(),
    ...(memoryDate ? { memoryDate } : {}),
  });
}

export async function updateMemory(
  coupleId: string,
  id: string,
  updates: { caption?: string; memoryDate?: string }
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'memories', id), updates);
}

export async function reactToMemory(
  coupleId: string,
  id: string,
  uid: string,
  emoji: string
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'memories', id), {
    [`reactions.${uid}`]: emoji,
  });
}

export async function deleteMemory(coupleId: string, memoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'memories', memoryId));
}
