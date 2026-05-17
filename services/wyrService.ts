import { doc, setDoc, updateDoc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { WYRLevel } from '../constants/content';

export type WYRAnswer = 'a' | 'b';

export interface WYRSession {
  level: WYRLevel;
  questionIndex: number;
  answers: Record<string, WYRAnswer>; // { uid: 'a'|'b' }
  revealed: boolean;
  score: { match: number; total: number };
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

export async function nextWYRQuestion(coupleId: string, session: WYRSession, uids: [string, string]): Promise<void> {
  const matched = session.answers[uids[0]] === session.answers[uids[1]];
  await updateDoc(doc(db, 'couples', coupleId, 'wyr', 'active'), {
    questionIndex: session.questionIndex + 1,
    answers: {},
    revealed: false,
    'score.total': session.score.total + 1,
    'score.match': session.score.match + (matched ? 1 : 0),
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
