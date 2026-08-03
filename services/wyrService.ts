import { doc, setDoc, updateDoc, onSnapshot, collection, runTransaction, getDoc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { WYRLevel } from '../constants/content';
import { TodoCategory } from './todoService';

export type WYRAnswer = 'a' | 'b';

export interface WYRSession {
  level: WYRLevel;
  questionIndex: number;
  answers: Record<string, WYRAnswer>; // { uid: 'a'|'b' }
  revealed: boolean;
  score: { match: number; total: number };
  // Optional themed pack id. When set, the screen loads questions from
  // WYR_PACKS[packId] instead of filtering WYR_QUESTIONS by level.
  // The `level` field is still populated (from the pack's own primary
  // level or the current question) for styling / paid-gate purposes.
  packId?: string;
  // Whether the current match has been saved to the Together List. Absent
  // means unsaved. Reset back to false on nextWYRQuestion so the next
  // match's Save button starts fresh.
  savedToList?: boolean;
  // Optional hunch per user for the current question — "what will my
  // partner pick?" Cleared on nextWYRQuestion. Absent means the user
  // skipped the hunch. Correct guesses feed guessScore below.
  guesses?: Record<string, WYRAnswer>;
  // Session-level guess accuracy for each user. Incremented in
  // nextWYRQuestion based on whether the user's guess matched partner's
  // actual answer. Absent map / uid = no hunches placed yet.
  guessScore?: Record<string, { correct: number; total: number }>;
}

export function subscribeWYR(coupleId: string, onChange: (s: WYRSession | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'wyr', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as WYRSession) : null);
  });
}

export async function startWYR(coupleId: string, level: WYRLevel, packId?: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'wyr', 'active'), {
    level,
    questionIndex: 0,
    answers: {},
    revealed: false,
    score: { match: 0, total: 0 },
    ...(packId ? { packId } : {}),
  });
}

export async function answerWYR(coupleId: string, uid: string, answer: WYRAnswer, _session?: WYRSession): Promise<void> {
  // Transaction reads the live state so two simultaneous answers can't both
  // see 'only my answer' and miss flipping revealed=true.
  const ref = doc(db, 'couples', coupleId, 'wyr', 'active');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const live = snap.data() as WYRSession;
    const newAnswers = { ...live.answers, [uid]: answer };
    const bothAnswered = Object.keys(newAnswers).length >= 2;
    tx.update(ref, {
      [`answers.${uid}`]: answer,
      ...(bothAnswered ? { revealed: true } : {}),
    });
  });
}

// Save a hunch — "I think my partner will pick X" — for the current
// question. Cleared on nextWYRQuestion. Optional per user per question,
// so a caller who never taps a hunch chip simply never calls this.
export async function guessWYR(coupleId: string, uid: string, guess: WYRAnswer): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'wyr', 'active'), {
    [`guesses.${uid}`]: guess,
  });
}

// Transaction so two rapid "Next question" taps (partner and me at reveal
// time) don't both read questionIndex=N and both write N+1, or both add 1
// to score.total from the same stale snapshot.
export async function nextWYRQuestion(coupleId: string, _session: WYRSession, uids: [string, string]): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'wyr', 'active');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const live = snap.data() as WYRSession;
    // Idempotency guard: if answers already cleared by the other partner, this
    // is a duplicate advance — no-op.
    if (Object.keys(live.answers ?? {}).length === 0) return;
    const matched = live.answers[uids[0]] === live.answers[uids[1]];
    // Score any hunches placed this round. Each user's guess is checked
    // against the OTHER user's actual answer. Guesses are opt-in per
    // question so users who skipped just don't get their guessScore
    // incremented.
    const guesses = live.guesses ?? {};
    const prevGuessScore = live.guessScore ?? {};
    const nextGuessScore = { ...prevGuessScore };
    for (const uid of uids) {
      const guess = guesses[uid];
      if (!guess) continue;
      const otherUid = uids[0] === uid ? uids[1] : uids[0];
      const partnerAnswer = live.answers[otherUid];
      const prev = nextGuessScore[uid] ?? { correct: 0, total: 0 };
      nextGuessScore[uid] = {
        correct: prev.correct + (guess === partnerAnswer ? 1 : 0),
        total: prev.total + 1,
      };
    }
    tx.update(ref, {
      questionIndex: live.questionIndex + 1,
      answers: {},
      guesses: {},
      guessScore: nextGuessScore,
      revealed: false,
      savedToList: false,
      'score.total': live.score.total + 1,
      'score.match': live.score.match + (matched ? 1 : 0),
    });
  });
}

// Save the current match's winning option to the Together List. Atomic:
// creates the todo doc AND flips savedToList in a single transaction so
// two rapid taps (both partners hit Save at the same tick) can't produce
// two duplicate todos. The pre-generated todoRef lets us write into
// /todos from within the transaction — addDoc can't be called inside a
// transaction, but tx.set on a doc() with a fresh id can.
export async function saveMatchToList(
  coupleId: string,
  uid: string,
  text: string,
  category: TodoCategory,
): Promise<{ savedNow: boolean }> {
  const wyrRef = doc(db, 'couples', coupleId, 'wyr', 'active');
  const todoRef = doc(collection(db, 'couples', coupleId, 'todos'));
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(wyrRef);
    if (!snap.exists()) return { savedNow: false };
    const live = snap.data() as WYRSession;
    if (live.savedToList) return { savedNow: false }; // Already saved, no-op
    if (!live.revealed) return { savedNow: false }; // Guard: don't save pre-reveal
    tx.set(todoRef, {
      text,
      category,
      completed: false,
      createdBy: uid,
      createdAt: Date.now(),
      source: 'wyr',
    });
    tx.update(wyrRef, { savedToList: true });
    return { savedNow: true };
  });
}

export async function resetWYR(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'wyr', 'active'), {
    level: 'playful',
    questionIndex: 0,
    answers: {},
    guesses: {},
    guessScore: {},
    revealed: false,
    score: { match: 0, total: 0 },
  });
}

// Historical best-ever match rate for the couple across all levels and
// sessions. Persisted at couples/{coupleId}/wyr/records so it survives
// resetWYR (which wipes the active session). The session summary card
// compares current-session rate against this baseline to say things like
// "This is your best ever!" or "Close to your best of 92%".
//
// Schema (all optional so a missing doc reads as "no record yet"):
//   bestPct: number         // percentage 0-100
//   bestLevel: WYRLevel     // level of the best session
//   bestMatch: number       // raw match count
//   bestTotal: number       // raw total count
//   bestAt: number          // ms timestamp
export interface WYRRecords {
  bestPct?: number;
  bestLevel?: WYRLevel;
  bestMatch?: number;
  bestTotal?: number;
  bestAt?: number;
}

export async function getWYRRecords(coupleId: string): Promise<WYRRecords> {
  const snap = await getDoc(doc(db, 'couples', coupleId, 'wyr', 'records'));
  return snap.exists() ? (snap.data() as WYRRecords) : {};
}

// Update the persistent best-ever record if the given session's rate
// beats it. Guarded by minTotal so a lucky 3-out-of-3 (100%) doesn't
// permanently record "Twin flames" and block realistic later sessions
// from ever surfacing as new bests.
export async function updateWYRRecordIfBest(
  coupleId: string,
  match: number,
  total: number,
  level: WYRLevel,
  minTotal: number = 10,
): Promise<{ becameBest: boolean; pct: number }> {
  const pct = total > 0 ? Math.round((match / total) * 100) : 0;
  if (total < minTotal) return { becameBest: false, pct };
  const ref = doc(db, 'couples', coupleId, 'wyr', 'records');
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as WYRRecords) : {};
  const currentBest = existing.bestPct ?? -1;
  if (pct <= currentBest) return { becameBest: false, pct };
  await setDoc(ref, {
    bestPct: pct,
    bestLevel: level,
    bestMatch: match,
    bestTotal: total,
    bestAt: Date.now(),
  }, { merge: true });
  return { becameBest: true, pct };
}
