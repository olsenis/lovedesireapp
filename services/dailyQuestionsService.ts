import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { QUESTIONS, Question, QuestionCategory } from '../constants/content';

export interface DailyQuestionDoc {
  date: string;
  items: Question[];
  discussed: Record<string, number[]>;
  answers: Record<string, Record<string, string>>; // uid -> { "gi": answer }
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

const CATEGORIES: QuestionCategory[] = ['playful', 'deep', 'spicy'];

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

// If any item's category isn't in the current CATEGORIES set, the doc was
// written with a stale schema (e.g. after we consolidated 6 categories into 3
// in July 2026). Regenerate rather than showing an empty screen.
function hasStaleCategories(items: Question[]): boolean {
  return items.some((q) => !CATEGORIES.includes(q.category));
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
      const data = snap.data() as DailyQuestionDoc;
      if (hasStaleCategories(data.items ?? [])) {
        // Regenerate with current schema. Keep existing answers/discussed so
        // any progress today isn't lost.
        const items = pickDailyQuestions(date, coupleId, isLDR);
        const migrated: DailyQuestionDoc = {
          date,
          items,
          discussed: data.discussed ?? {},
          answers: data.answers ?? {},
        };
        await setDoc(ref, migrated);
        onChange(migrated);
        return;
      }
      onChange(data);
    } else {
      const items = pickDailyQuestions(date, coupleId, isLDR);
      const newDoc: DailyQuestionDoc = { date, items, discussed: {}, answers: {} };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
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
