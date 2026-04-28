import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { QUESTIONS, Question, QuestionCategory } from '../constants/content';

export interface DailyQuestionDoc {
  date: string;
  items: Question[];                                   // 18 questions: 3 per category
  discussed: Record<string, number[]>;                 // { uid: [globalIndex, ...] }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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

function pickDailyQuestions(date: string, coupleId: string): Question[] {
  const result: Question[] = [];
  for (const cat of CATEGORIES) {
    const pool = QUESTIONS.filter((q) => q.category === cat);
    const shuffled = deterministicShuffle(pool, date + coupleId + cat);
    result.push(...shuffled.slice(0, 3));
  }
  return result; // 18 questions: fun[0-2], deep[3-5], romantic[6-8], spicy[9-11], therapy[12-14], fantasy[15-17]
}

export function subscribeDailyQuestions(
  coupleId: string,
  onChange: (doc: DailyQuestionDoc) => void
): Unsubscribe {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyQuestions', date);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as DailyQuestionDoc);
    } else {
      const items = pickDailyQuestions(date, coupleId);
      const newDoc: DailyQuestionDoc = { date, items, discussed: {} };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
  });
}

export async function markDiscussed(
  coupleId: string,
  uid: string,
  globalIndex: number,
  current: DailyQuestionDoc
): Promise<void> {
  const already = current.discussed[uid] ?? [];
  if (already.includes(globalIndex)) return;
  const date = todayKey();
  await updateDoc(doc(db, 'couples', coupleId, 'dailyQuestions', date), {
    [`discussed.${uid}`]: [...already, globalIndex],
  });
}

export function bothDiscussed(doc: DailyQuestionDoc, index: number, uid1: string, uid2: string): boolean {
  return (doc.discussed[uid1] ?? []).includes(index) && (doc.discussed[uid2] ?? []).includes(index);
}
