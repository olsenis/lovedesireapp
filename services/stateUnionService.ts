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

export interface StateUnionDoc {
  weekId: string;
  startedAt: number;
  answers: Record<string, Record<string, string>>;
  completedAt?: Record<string, number>;
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

export async function ensureStateUnionDoc(coupleId: string, weekId: string): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'stateUnion', weekId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const newDoc: StateUnionDoc = { weekId, startedAt: Date.now(), answers: {}, completedAt: {} };
    await setDoc(ref, newDoc);
  }
}

export async function submitStateUnionAnswer(
  coupleId: string,
  weekId: string,
  uid: string,
  questionIndex: number,
  answer: string,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'stateUnion', weekId), {
    [`answers.${uid}.${questionIndex}`]: answer,
  });
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
  const a = suDoc.answers?.[uid] ?? {};
  return Object.values(a).filter((s) => s && s.trim().length > 0).length;
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
