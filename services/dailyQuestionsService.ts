import { doc, setDoc, updateDoc, onSnapshot, arrayUnion, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { QUESTIONS, Question, QuestionCategory } from '../constants/content';
import { trackEvent } from './statsService';

export interface DailyQuestionDoc {
  date: string;
  items: Question[];
  discussed: Record<string, number[]>;
  answers: Record<string, Record<string, string>>; // uid -> { "gi": answer }
  // Guess-partner-answer map added Aug 2026 when Versus was merged into
  // Daily. Only populated for binary questions. Keyed same as answers:
  // uid -> gi (as string) -> option text guessed. Absent = user skipped
  // the guess step (no negative score signal). Compare with
  // answers[partnerUid][gi] for correct/wrong evaluation.
  guesses?: Record<string, Record<string, string>>;
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
  trackEvent('daily_question_answered');
}

export function bothAnswered(
  dailyDoc: DailyQuestionDoc,
  index: number,
  uid1: string,
  uid2: string
): boolean {
  return !!(dailyDoc.answers?.[uid1]?.[String(index)]) && !!(dailyDoc.answers?.[uid2]?.[String(index)]);
}

// Guess-partner-answer submission. Only meaningful for binary questions
// (caller should gate on item.format === 'binary'). Stores the option
// TEXT (not 'a'/'b') for direct string equality against answers on the
// compare side — mirrors how answers themselves are stored.
export async function submitGuess(
  coupleId: string,
  uid: string,
  globalIndex: number,
  guessOptionText: string,
  dateKey: string = todayKey(),
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'dailyQuestions', dateKey), {
    [`guesses.${uid}.${globalIndex}`]: guessOptionText,
  });
  trackEvent('daily_guess_submitted');
}

// Sentinel written to guesses.{uid}.{gi} when the user taps "Just show
// me" on the guess modal (or dismisses via Android back). Persists the
// skip so cold reload keeps reveal unlocked — before H28 this was
// tracked only in local state and cold reload dead-locked the reveal
// (Review #8 B1). Distinguished from real option-text guesses by the
// double-underscore prefix — no question option can collide. Filtered
// out of stats + streak computations below.
export const GUESS_SKIPPED = '__skipped__';

export async function skipGuess(
  coupleId: string,
  uid: string,
  globalIndex: number,
  dateKey: string = todayKey(),
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'dailyQuestions', dateKey), {
    [`guesses.${uid}.${globalIndex}`]: GUESS_SKIPPED,
  });
  trackEvent('daily_guess_skipped');
}

// Read-computed weekly hit rate. Iterates last-7-days dailyQuestions
// docs, cross-references caller's guesses against partner's answers.
// Ignores questions the partner didn't answer (can't score a guess with
// no ground truth). Absent guesses map = graceful zero.
export async function getWeeklyGuessStats(
  coupleId: string,
  myUid: string,
  partnerUid: string,
): Promise<{ correct: number; total: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  // Firestore query on the collection filtered by date key >= cutoff.
  // Docs are keyed by YYYY-MM-DD so string ordering matches date order.
  const { collection: coll, query: q, where, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(q(coll(db, 'couples', coupleId, 'dailyQuestions'), where('date', '>=', cutoffKey)));
  let correct = 0;
  let total = 0;
  snap.docs.forEach((d) => {
    const data = d.data() as DailyQuestionDoc;
    const myGuesses = data.guesses?.[myUid] ?? {};
    const partnerAnswers = data.answers?.[partnerUid] ?? {};
    Object.entries(myGuesses).forEach(([gi, guess]) => {
      // Filter H28 sentinel — a skip is neither a right nor wrong guess,
      // so it should not inflate the denominator on the Home mini stat.
      if (guess === GUESS_SKIPPED) return;
      const partnerAns = partnerAnswers[gi];
      if (!partnerAns) return;
      total++;
      if (guess === partnerAns) correct++;
    });
  });
  return { correct, total };
}

// Consecutive-days streak of at least one correct guess. Iterates
// backward from today. Days with zero guesses OR zero correct guesses
// break the streak. Days with a mix of correct and wrong still count.
// Skip-only days (H28: all guesses are GUESS_SKIPPED sentinel) are
// treated as "not counted" — same as days with no guesses at all,
// neither extend nor break the streak. Cap at 30 days scan to keep
// the query bounded.
export async function getGuessStreak(
  coupleId: string,
  myUid: string,
  partnerUid: string,
): Promise<number> {
  const { collection: coll, query: q, orderBy, limit, getDocs } = await import('firebase/firestore');
  const snap = await getDocs(q(coll(db, 'couples', coupleId, 'dailyQuestions'), orderBy('date', 'desc'), limit(30)));
  let streak = 0;
  for (const d of snap.docs) {
    const data = d.data() as DailyQuestionDoc;
    const myGuesses = data.guesses?.[myUid] ?? {};
    const partnerAnswers = data.answers?.[partnerUid] ?? {};
    let hadCorrect = false;
    let hadAnyGuess = false;
    for (const [gi, guess] of Object.entries(myGuesses)) {
      // Filter H28 sentinel — skip is not a scoreable attempt.
      if (guess === GUESS_SKIPPED) continue;
      const partnerAns = partnerAnswers[gi];
      if (!partnerAns) continue;
      hadAnyGuess = true;
      if (guess === partnerAns) { hadCorrect = true; break; }
    }
    if (!hadAnyGuess) continue; // day with no scoreable guesses is not counted (neither breaks nor extends)
    if (hadCorrect) streak++;
    else break;
  }
  return streak;
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
