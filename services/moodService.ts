import { collection, addDoc, query, where, getDocs, onSnapshot, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type MoodEmoji = '😍' | '🥰' | '😊' | '😌' | '😴' | '💪' | '😤' | '😢';

export const MOOD_LABELS: Record<MoodEmoji, string> = {
  '😍': 'In love',
  '🥰': 'Warm & fuzzy',
  '😊': 'Happy',
  '😌': 'Calm',
  '😴': 'Tired',
  '💪': 'Motivated',
  '😤': 'Frustrated',
  '😢': 'Sad',
};

export const ALL_MOODS: MoodEmoji[] = ['😍', '🥰', '😊', '😌', '😴', '💪', '😤', '😢'];

export interface MoodEntry {
  id: string;
  uid: string;
  emoji: MoodEmoji;
  note?: string;
  createdAt: number;
}

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function setMood(coupleId: string, uid: string, emoji: MoodEmoji, note?: string): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'moods'), {
    uid,
    emoji,
    note: note ?? '',
    createdAt: Date.now(),
  });
}

export async function getTodaysMood(coupleId: string, uid: string): Promise<MoodEntry | null> {
  const q = query(
    collection(db, 'couples', coupleId, 'moods'),
    where('uid', '==', uid),
    where('createdAt', '>=', todayStart()),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as MoodEntry;
}

export function subscribeToMoods(coupleId: string, onChange: (moods: MoodEntry[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'moods'),
    where('createdAt', '>=', todayStart()),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MoodEntry)));
  });
}
