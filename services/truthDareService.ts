import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DareLevel } from '../constants/content';

export type TDPhase = 'picking' | 'answering' | 'done';

export interface TruthDareCard {
  type: 'truth' | 'dare';
  text: string;
  answer?: string;
  answeredBy?: string;
}

export interface TruthDareSession {
  level: DareLevel;
  turnUid: string;
  phase: TDPhase;
  card: TruthDareCard | null;
  scores: Record<string, number>;
  round: number;
}

export function subscribeTruthDare(coupleId: string, onChange: (s: TruthDareSession | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'truthDare', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as TruthDareSession) : null);
  });
}

export async function startTruthDare(coupleId: string, starterUid: string, level: DareLevel): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    level,
    turnUid: starterUid,
    phase: 'picking',
    card: null,
    scores: {},
    round: 1,
  });
}

export async function playCard(coupleId: string, card: TruthDareCard): Promise<void> {
  // Dare → immediately 'done' (both see it, no answer needed)
  // Truth → 'answering' (partner must type answer)
  const phase: TDPhase = card.type === 'dare' ? 'done' : 'answering';
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), { card, phase });
}

export async function submitTruthAnswer(coupleId: string, uid: string, answer: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    'card.answer': answer,
    'card.answeredBy': uid,
    phase: 'done',
  });
}

export async function nextTurn(
  coupleId: string,
  session: TruthDareSession,
  uid: string,
  partnerId: string
): Promise<void> {
  const nextUid = session.turnUid === uid ? partnerId : uid;
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    turnUid: nextUid,
    phase: 'picking',
    card: null,
    round: session.round + 1,
    [`scores.${uid}`]: (session.scores[uid] ?? 0) + 1,
  });
}

export async function resetTruthDare(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    level: 'flirty',
    turnUid: '',
    phase: 'picking',
    card: null,
    scores: {},
    round: 0,
  });
}
