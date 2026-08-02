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
  // Whether the current match has been saved to the Together List. Absent
  // means unsaved. Reset back to false on nextWYRQuestion so the next
  // match's Save button starts fresh.
  savedToList?: boolean;
}

export function subscribeWYR(coupleId: string, onChange: (s: WYRSession | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'wyr', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as WYRSession) : null);
  });
}

export async function startWYR(coupleId: string, level: WYRLevel): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'wyr', 'active'), {
    level,
    questionIndex: 0,
    answers: {},
    revealed: false,
    score: { match: 0, total: 0 },
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
    tx.update(ref, {
      questionIndex: live.questionIndex + 1,
      answers: {},
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
