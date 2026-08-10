import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { QUESTIONS, Question, QuestionCategory } from '../constants/content';

export interface DailyQuestionDoc {
  date: string;
  items: Question[];
  discussed: Record<string, number[]>;
  answers: Record<string, Record<string, string>>; // uid -> { "gi": answer }
  // Paid-only bonus draws stacked on top of the base daily set. Each draw
  // extends items by 3 per category (playful/deep/spicy). Capped at 3.
  bonusDraws?: number;
}

// Base picks per category + how many are added per bonus draw. Both partners
// see the same items because the shuffle seed is date+coupleId+cat — bonus
// draws just extend the slice length. Cap at 3 bonus draws total (12 per cat).
const BASE_PER_CAT = 3;
const BONUS_PER_CAT = 3;
export const MAX_BONUS_DRAWS = 3;

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

// Base pass fills known indices (playful 0-2, deep 3-5, spicy 6-8). Bonus
// draws APPEND items grouped by category so existing answer indices never
// shift when a partner draws more mid-day.
function pickDailyQuestions(date: string, coupleId: string, isLDR: boolean, bonusDraws = 0): Question[] {
  const draws = Math.max(0, Math.min(bonusDraws, MAX_BONUS_DRAWS));
  const result: Question[] = [];
  const poolFor = (cat: QuestionCategory) => QUESTIONS.filter((q) => {
    if (q.category !== cat) return false;
    if (!isLDR && q.tags?.includes('ldr')) return false;
    return true;
  });
  for (const cat of CATEGORIES) {
    const shuffled = deterministicShuffle(poolFor(cat), date + coupleId + cat);
    result.push(...shuffled.slice(0, BASE_PER_CAT));
  }
  for (let d = 1; d <= draws; d++) {
    for (const cat of CATEGORIES) {
      const shuffled = deterministicShuffle(poolFor(cat), date + coupleId + cat);
      const startAt = BASE_PER_CAT + (d - 1) * BONUS_PER_CAT;
      result.push(...shuffled.slice(startAt, startAt + BONUS_PER_CAT));
    }
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
        // any progress today isn't lost. Preserve bonusDraws so a paid user
        // who drew more today doesn't lose their extra cards on a hot migration.
        const items = pickDailyQuestions(date, coupleId, isLDR, data.bonusDraws ?? 0);
        const migrated: DailyQuestionDoc = {
          date,
          items,
          discussed: data.discussed ?? {},
          answers: data.answers ?? {},
          bonusDraws: data.bonusDraws ?? 0,
        };
        await setDoc(ref, migrated);
        onChange(migrated);
        return;
      }
      onChange(data);
    } else {
      const items = pickDailyQuestions(date, coupleId, isLDR);
      const newDoc: DailyQuestionDoc = { date, items, discussed: {}, answers: {}, bonusDraws: 0 };
      await setDoc(ref, newDoc);
      onChange(newDoc);
    }
  });
}

// Increments bonusDraws + regenerates items to include the additional slice.
// Idempotent race protection via transaction — if two clients race the
// increment, only one draw is added, and both see the resulting item set.
// Caller must gate on paid subscription; service does not enforce paywall.
// Returns the new bonusDraws count for UI feedback (e.g. "1 of 3 draws used").
export async function drawMoreQuestions(
  coupleId: string,
  isLDR: boolean,
): Promise<{ bonusDraws: number; capped: boolean }> {
  const date = todayKey();
  const ref = doc(db, 'couples', coupleId, 'dailyQuestions', date);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? (snap.data() as DailyQuestionDoc).bonusDraws ?? 0 : 0;
    if (current >= MAX_BONUS_DRAWS) return { bonusDraws: current, capped: true };
    const next = current + 1;
    const items = pickDailyQuestions(date, coupleId, isLDR, next);
    if (snap.exists()) {
      tx.update(ref, { items, bonusDraws: next });
    } else {
      // Doc might not exist yet if user hits Draw More before the subscribe
      // effect committed the initial generation. Create it in-transaction.
      tx.set(ref, { date, items, discussed: {}, answers: {}, bonusDraws: next });
    }
    return { bonusDraws: next, capped: false };
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
