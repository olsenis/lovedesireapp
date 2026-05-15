import { collection, onSnapshot, orderBy, query, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

// NOTE: The old Memories feature was replaced by Moments (app/moments.tsx).
// This service is kept read-only so the "On this day" card on the home screen
// can still surface historical Memory data. No writes happen here anymore.

export interface Memory {
  id: string;
  photoURL: string;
  caption: string;
  createdBy: string;
  createdAt: number;
  memoryDate?: string;
  reactions?: Record<string, string>;
}

export function subscribeMemories(coupleId: string, onChange: (memories: Memory[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'memories'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory)));
  });
}
