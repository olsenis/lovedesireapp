import { collection, addDoc, query, getDocs, onSnapshot, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { awardPoints, POINTS } from './levelsService';

export type MoodEmoji = '😍' | '🥰' | '😊' | '😌' | '😴' | '💪' | '😤' | '😢' | '🥺' | '😰' | '😈' | '🥵';

export const MOOD_LABELS: Record<MoodEmoji, string> = {
  '😍': 'In love',
  '🥰': 'Warm & fuzzy',
  '😊': 'Happy',
  '😌': 'Calm',
  '😴': 'Tired',
  '💪': 'Motivated',
  '😤': 'Frustrated',
  '😢': 'Sad',
  '🥺': 'Missing you',
  '😰': 'Anxious',
  '😈': 'Kinky',
  '🥵': 'Horny',
};

export const ALL_MOODS: MoodEmoji[] = ['😍', '🥰', '😊', '😌', '😴', '💪', '😤', '😢', '🥺', '😰', '😈', '🥵'];

export interface MoodEntry {
  id: string;
  uid: string;
  emoji: MoodEmoji;
  note?: string;
  createdAt: number;
}

// UTC day boundary — matches every other date-keyed service (dailyQuestions,
// dailyWishes, moments, sensate, storage). Local-time boundary used to mean
// LDR couples in different timezones saw mood "today" drift one day relative
// to all other features, breaking streak counters and "today's mood" logic.
function todayStart(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export async function setMood(coupleId: string, uid: string, emoji: MoodEmoji, note?: string): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'moods'), {
    uid,
    emoji,
    note: note ?? '',
    createdAt: Date.now(),
  });
  awardPoints(coupleId, POINTS.mood).catch(() => {});
}

// Fetches today's mood without compound index, uses single-field orderBy + client-side filter
export async function getTodaysMood(coupleId: string, uid: string): Promise<MoodEntry | null> {
  const today = todayStart();
  const q = query(collection(db, 'couples', coupleId, 'moods'), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  const mood = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as MoodEntry))
    .find((m) => m.uid === uid && m.createdAt >= today);
  return mood ?? null;
}

// Subscribes to today's moods without compound index, single-field orderBy, client-side date filter
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

// Subscribes to last 60 days of moods for both partners (for history view)
export function subscribeMoodHistory(coupleId: string, onChange: (moods: MoodEntry[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'moods'), orderBy('createdAt', 'desc'), limit(120));
  const cutoff = Date.now() - 60 * 86400000;
  return onSnapshot(q, (snap) => {
    const moods = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as MoodEntry))
      .filter((m) => m.createdAt >= cutoff);
    onChange(moods);
  });
}
