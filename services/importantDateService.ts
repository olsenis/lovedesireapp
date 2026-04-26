import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface ImportantDate {
  id: string;
  label: string;
  date: number; // timestamp (year/month/day only — ignore time)
  emoji: string;
  createdBy: string;
  createdAt: number;
}

export function subscribeDates(coupleId: string, onChange: (dates: ImportantDate[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'dates'), orderBy('date', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ImportantDate)));
  });
}

export async function addImportantDate(
  coupleId: string,
  label: string,
  date: number,
  emoji: string,
  createdBy: string
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'dates'), {
    label,
    date,
    emoji,
    createdBy,
    createdAt: Date.now(),
  });
}

export async function deleteImportantDate(coupleId: string, dateId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'dates', dateId));
}

export function getDaysUntil(timestamp: number): number {
  const target = new Date(timestamp);
  const now = new Date();
  // Next occurrence this year or next year
  target.setFullYear(now.getFullYear());
  if (target < now) target.setFullYear(now.getFullYear() + 1);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
