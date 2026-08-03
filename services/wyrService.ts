import { doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, addDoc, runTransaction, getDoc, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { WYRLevel, WYRQuestion } from '../constants/content';
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

// Delete the active session doc entirely so subscribeWYR fires with null
// and the caller lands back on the level picker. Previous behaviour was
// setDoc({ level: 'playful', ... }) which technically "reset" but locked
// the user into Playful — the level badge "Change level" flow felt like
// a no-op because it never surfaced the picker.
export async function resetWYR(coupleId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'wyr', 'active'));
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

// Custom WYR questions authored by the couple themselves. Mixed into the
// per-level pool alongside curated WYR_QUESTIONS. Stored under a
// dedicated subcollection (NOT under wyr/active) so they survive
// resetWYR — a level reset wipes the active session doc but should not
// blow away the couple's authored library.
//
// Firestore path: couples/{coupleId}/wyrCustom/{id}
//
// Rules: falls under the existing couple wildcard subcollection rule.
// createdBy identity guard enforces the writer is the requester.
export interface WYRCustomQuestion extends WYRQuestion {
  id: string;
  createdAt: number;
  createdBy: string; // uid
}

export function subscribeCustomWYRQuestions(coupleId: string, onChange: (qs: WYRCustomQuestion[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'wyrCustom'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WYRCustomQuestion)));
  });
}

export async function addCustomWYRQuestion(
  coupleId: string,
  uid: string,
  data: { a: string; b: string; level: WYRLevel; discussion?: string },
): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'wyrCustom'), {
    ...data,
    createdAt: Date.now(),
    createdBy: uid,
  });
  // Best-effort jump the active session so the couple actually plays
  // the new question next instead of it landing at the tail of a 70-item
  // curated pool. Only touch the session when it's mid-level (not pack
  // mode) and on the same level as the new question — otherwise a
  // Playful custom would nuke a Romantic session's state for no reason.
  //
  // The pair with the levelQuestions array putting newest custom at
  // index 0 (see would-you-rather.tsx) means questionIndex=0 = the new
  // custom. Answers + revealed reset so both partners answer fresh; the
  // score isn't touched, so the running match/total stays intact.
  try {
    const activeRef = doc(db, 'couples', coupleId, 'wyr', 'active');
    const snap = await getDoc(activeRef);
    if (snap.exists()) {
      const live = snap.data() as WYRSession;
      if (live.level === data.level && !live.packId) {
        await updateDoc(activeRef, {
          questionIndex: 0,
          answers: {},
          revealed: false,
          savedToList: false,
        });
      }
    }
  } catch {
    // No active session or write blocked — new custom will surface next
    // time the couple starts a session on this level.
  }
  return ref.id;
}

export async function deleteCustomWYRQuestion(coupleId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'wyrCustom', id));
}
