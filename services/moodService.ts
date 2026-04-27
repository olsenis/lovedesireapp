import { collection, addDoc, query, getDocs, onSnapshot, orderBy, limit, Unsubscribe } from 'firebase/firestore';
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

// Fetches today's mood without compound index — uses single-field orderBy + client-side filter
export async function getTodaysMood(coupleId: string, uid: string): Promise<MoodEntry | null> {
  const today = todayStart();
  const q = query(collection(db, 'couples', coupleId, 'moods'), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  const mood = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MoodEntry))
    .find((m) => m.uid === uid && m.createdAt >= today);
  return mood ?? null;
}

// Subscribes to today's moods without compound index — single-field orderBy, client-side date filter
export function subscribeToMoods(coupleId: string, onChange: (moods: MoodEntry[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'moods'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const today = todayStart();
    const moods = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as MoodEntry))
      .filter((m) => m.createdAt >= today);
    onChange(moods);
  });
}
