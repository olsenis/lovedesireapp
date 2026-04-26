import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface Memory {
  id: string;
  photoURL: string;
  caption: string;
  createdBy: string;
  createdAt: number;
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
  createdBy: string
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'memories'), {
    photoURL,
    caption,
    createdBy,
    createdAt: Date.now(),
  });
}

export async function deleteMemory(coupleId: string, memoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'memories', memoryId));
}
