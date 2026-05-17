import { doc, setDoc, updateDoc, getDoc, onSnapshot, arrayUnion, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { QUESTIONS, Question, QuestionCategory } from '../constants/content';
import { awardPoints, POINTS } from './levelsService';

export interface DailyQuestionDoc {
  date: string;
  items: Question[];
  discussed: Record<string, number[]>;
  answers: Record<string, Record<string, string>>; // uid -> { "gi": answer }
}

export interface QuestionStreak {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function deterministicShuffle(pool: Question[], seedStr: string): Question[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
  }
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const j = Math.abs(seed) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const CATEGORIES: QuestionCategory[] = ['fun', 'deep', 'romantic', 'spicy', 'therapy', 'fantasy'];

function pickDailyQuestions(date: string, coupleId: string, isLDR: boolean): Question[] {
  const result: Question[] = [];
  for (const cat of CATEGORIES) {
    const pool = QUESTIONS.filter((q) => {
      if (q.category !== cat) return false;
      // LDR-tagged questions are gibberish for cohabiting couples
      if (!isLDR && q.tags?.includes('ldr')) return false;
      return true;
    });
    const shuffled = deterministicShuffle(pool, date + coupleId + cat);
    result.push(...shuffled.slice(0, 3));
  }
  return result;
}

export function subscribeDailyQuestions(
  coupleId: string,
  onChange: (doc: DailyQuestionDoc) => void,
  options?: { isLDR?: boolean },
): Unsubscribe {
  const date = todayKey();
  const isLDR = options?.isLDR ?? false;
  const ref = doc(db, 'couples', coupleId, 'dailyQuestions', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as DailyQuestionDoc);
    } else {
      const items = pickDailyQuestions(date, coupleId, isLDR);
      const newDoc: DailyQuestionDoc = { date, items, discussed: {}, answers: {} };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
  });
}

export function subscribeStreak(
  coupleId: string,
  onChange: (s: QuestionStreak) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'streaks', 'questions'), (snap) => {
    onChange(snap.exists() ? (snap.data() as QuestionStreak) : { count: 0, lastDate: '' });
  });
}

export async function submitAnswer(
  coupleId: string,
  uid: string,
  globalIndex: number,
  answer: string
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'dailyQuestions', todayKey()), {
    [`answers.${uid}.${globalIndex}`]: answer,
  });
  awardPoints(coupleId, POINTS.questionAnswered).catch(() => {});
}

export async function checkAndUpdateStreak(coupleId: string): Promise<void> {
  const streakRef = doc(db, 'couples', coupleId, 'streaks', 'questions');
  const today = todayKey();
  const snap = await getDoc(streakRef);
  if (!snap.exists()) {
    await setDoc(streakRef, { count: 1, lastDate: today });
    awardPoints(coupleId, POINTS.questionStreakDay).catch(() => {});
    return;
  }
  const streak = snap.data() as QuestionStreak;
  if (streak.lastDate === today) return;
  const newCount = streak.lastDate === yesterdayKey() ? streak.count + 1 : 1;
  await setDoc(streakRef, { count: newCount, lastDate: today });
  awardPoints(coupleId, POINTS.questionStreakDay).catch(() => {});
}

export function bothAnswered(
  dailyDoc: DailyQuestionDoc,
  index: number,
  uid1: string,
  uid2: string
): boolean {
  return !!(dailyDoc.answers?.[uid1]?.[String(index)]) && !!(dailyDoc.answers?.[uid2]?.[String(index)]);
}

export async function markDiscussed(
  coupleId: string,
  uid: string,
  globalIndex: number,
  _current: DailyQuestionDoc
): Promise<void> {
  // arrayUnion is atomic — no race even if called twice in quick succession.
  await updateDoc(doc(db, 'couples', coupleId, 'dailyQuestions', todayKey()), {
    [`discussed.${uid}`]: arrayUnion(globalIndex),
  });
}

export function bothDiscussed(
  dailyDoc: DailyQuestionDoc,
  index: number,
  uid1: string,
  uid2: string
): boolean {
  return (
    (dailyDoc.discussed[uid1] ?? []).includes(index) &&
    (dailyDoc.discussed[uid2] ?? []).includes(index)
  );
}
