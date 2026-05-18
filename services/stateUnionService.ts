import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

// 5 Gottman-inspired questions for the weekly check-in
export const STATE_UNION_QUESTIONS: string[] = [
  'What went well between us this week?',
  'What was hard for you this week?',
  "What's one thing I appreciate about you?",
  "What's one thing I'd love more of from you?",
  'What are we looking forward to together?',
];

// Parent doc — both partners can always read this. Tracks completion only.
export interface StateUnionDoc {
  weekId: string;
  startedAt: number;
  // completedAt is the gate — until BOTH uids have a timestamp here,
  // each partner's entries subdoc is hidden from the other (firestore rules).
  completedAt?: Record<string, number>;
  // Optional progress counter so the partner can see "they're answering"
  // without seeing the answers themselves.
  answeredCount?: Record<string, number>;
}

// Per-user entries subdoc — readable by owner always, by partner only after both completed.
export interface StateUnionEntry {
  answers: Record<string, string>; // questionIndex -> answer text
  updatedAt: number;
}

export function getCurrentWeekId(d: Date = new Date()): string {
  // ISO 8601 week number, YYYY-WW
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-${String(weekNum).padStart(2, '0')}`;
}

// Parent metadata subscription — always allowed.
export function subscribeStateUnion(
  coupleId: string,
  weekId: string,
  onChange: (doc: StateUnionDoc | null) => void,
): Unsubscribe {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? (snap.data() as StateUnionDoc) : null);
  });
}

// Subscribe to a SPECIFIC user's entries doc. Firestore will return an error
// if the requester isn't allowed (i.e. partner trying to read partner's draft
// before both have completed). The caller should only subscribe to:
//   - their own (always allowed), OR
//   - partner's (only after bothCompleted is true).
export function subscribeStateUnionEntry(
  coupleId: string,
  weekId: string,
  uid: string,
  onChange: (entry: StateUnionEntry | null) => void,
): Unsubscribe {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  return onSnapshot(
    ref,
    (snap) => onChange(snap.exists() ? (snap.data() as StateUnionEntry) : null),
    () => onChange(null), // permission-denied is expected before both completed
  );
}

// One-shot fetch of a user's entries doc — used by the history view when the
// user expands a past week. Returns null if not found or permission denied.
export async function getStateUnionEntry(
  coupleId: string,
  weekId: string,
  uid: string,
): Promise<StateUnionEntry | null> {
  try {
    const snap = await getDoc(doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid));
    return snap.exists() ? (snap.data() as StateUnionEntry) : null;
  } catch {
    return null;
  }
}

export async function ensureStateUnionDoc(coupleId: string, weekId: string): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { weekId, startedAt: Date.now(), completedAt: {}, answeredCount: {} });
  }
}

export async function submitStateUnionAnswer(
  coupleId: string,
  weekId: string,
  uid: string,
  questionIndex: number,
  answer: string,
): Promise<void> {
  // Write the answer to the user's own entries doc — Firestore rules prevent
  // partner from reading this until both have completed.
  const entryRef = doc(db, 'couples', coupleId, 'stateUnion', weekId, 'entries', uid);
  await setDoc(
    entryRef,
    {
      [`answers.${questionIndex}`]: answer,
      updatedAt: Date.now(),
    },
    { merge: true },
  );
  // Mirror the progress count on the parent doc so the partner can see
  // "they've answered N/5" without seeing the answer text itself.
  const parentRef = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  const entrySnap = await getDoc(entryRef);
  const count = entrySnap.exists()
    ? Object.values(((entrySnap.data() as StateUnionEntry).answers ?? {}))
        .filter((s) => s && s.trim().length > 0).length
    : 0;
  await updateDoc(parentRef, { [`answeredCount.${uid}`]: count });
}

export async function markStateUnionCompleted(
  coupleId: string,
  weekId: string,
  uid: string,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'stateUnion', weekId), {
    [`completedAt.${uid}`]: Date.now(),
  });
}

export function answeredCount(suDoc: StateUnionDoc | null, uid: string): number {
  if (!suDoc) return 0;
  return suDoc.answeredCount?.[uid] ?? 0;
}

export function hasUserCompleted(suDoc: StateUnionDoc | null, uid: string): boolean {
  if (!suDoc) return false;
  return !!suDoc.completedAt?.[uid];
}

export function bothCompleted(suDoc: StateUnionDoc | null, uid1: string, uid2: string): boolean {
  return hasUserCompleted(suDoc, uid1) && hasUserCompleted(suDoc, uid2);
}

export function subscribeStateUnionHistory(
  coupleId: string,
  onChange: (history: StateUnionDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'couples', coupleId, 'stateUnion'),
    orderBy('startedAt', 'desc'),
    limit(12),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as StateUnionDoc));
  });
}
