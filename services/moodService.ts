import { collection, addDoc, query, getDocs, onSnapshot, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type MoodEmoji = '😍' | '🥰' | '😊' | '😌' | '🤗' | '😏' | '🫶' | '😴' | '💪' | '😤' | '😢' | '🥺' | '😰' | '🫥' | '💭' | '🌀' | '🥹' | '🙋' | '😈' | '🥵' | '💬';

export const MOOD_LABELS: Record<MoodEmoji, string> = {
  '😍': 'In love',
  '🥰': 'Warm & fuzzy',
  '😊': 'Happy',
  '😌': 'Calm',
  '🤗': 'Cuddly',
  '😏': 'Playful',
  '🫶': 'Grateful',
  '😴': 'Tired',
  '💪': 'Motivated',
  '😤': 'Frustrated',
  '😢': 'Sad',
  '🥺': 'Missing you',
  '😰': 'Anxious',
  '🫥': 'Off',
  '💭': 'In my head',
  '🌀': 'Overthinking',
  '🥹': 'Tender',
  '🙋': 'Check in with me',
  '😈': 'Kinky',
  '🥵': 'Horny',
  '💬': 'In my own words',
};

// Sep 2026: Cuddly / Playful / Grateful added; "more mood options" was the
// top request against the best-rated mood-first competitor.
// Sep 2026 (USER_VOICE C4): Off / In my head / Overthinking / Tender /
// Check in with me added, the set neurodivergent couples asked the mood-first
// competitor for. 💬 is the custom-words sentinel and is deliberately NOT in
// ALL_MOODS: the pickers add it as their own chip, Memory Lane's mood source
// and the Notes trigger picker stay bounded by this list.
export const ALL_MOODS: MoodEmoji[] = ['😍', '🥰', '😊', '😌', '🤗', '😏', '🫶', '😴', '💪', '😤', '😢', '🥺', '😰', '🫥', '💭', '🌀', '🥹', '🙋', '😈', '🥵'];
export const CUSTOM_MOOD: MoodEmoji = '💬';
export const CUSTOM_MOOD_MAX = 24;

// The label to print for a mood: the couple's own words when they wrote
// them, else the fixed label, else a safe fallback for anything unknown.
export function moodLabel(emoji: MoodEmoji | string, label?: string): string {
  if (label && label.trim()) return label.trim();
  return (MOOD_LABELS as Record<string, string>)[emoji] ?? 'a mood';
}

// The mood as a caption under an emoji (couple card, Mood History Together).
// Own words are shown in quotes so they read as the person's words. Until
// Sep 20 2026 the partner saw only the emoji: own words could not be read
// anywhere, and 🌀 or 🙋 said little without their label.
export function moodCaption(emoji: MoodEmoji | string, label?: string): string {
  return emoji === CUSTOM_MOOD && label && label.trim() ? `“${label.trim()}”` : moodLabel(emoji, label);
}

export interface MoodEntry {
  id: string;
  uid: string;
  emoji: MoodEmoji;
  note?: string;
  // Own words (C4): set when emoji is CUSTOM_MOOD; read through moodLabel().
  label?: string;
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

export async function setMood(coupleId: string, uid: string, emoji: MoodEmoji, note?: string, label?: string): Promise<void> {
  const clean = label?.trim().slice(0, CUSTOM_MOOD_MAX);
  await addDoc(collection(db, 'couples', coupleId, 'moods'), {
    uid,
    emoji,
    note: note ?? '',
    ...(clean ? { label: clean } : {}),
    createdAt: Date.now(),
  });
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
