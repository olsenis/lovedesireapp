import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DareLevel } from '../constants/content';

export interface TruthDareCard {
  type: 'truth' | 'dare';
  text: string;
  answer?: string;      // typed answer for truths
  answeredBy?: string;  // uid who answered
  revealed?: boolean;   // true when answer is shared with partner
}

export interface TruthDareSession {
  level: DareLevel;
  turnUid: string;          // uid of whoever's turn it is
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
    card: null,
    scores: {},
    round: 1,
  });
}

export async function playCard(coupleId: string, card: TruthDareCard): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), { card });
}

export async function submitTruthAnswer(coupleId: string, uid: string, answer: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    'card.answer': answer,
    'card.answeredBy': uid,
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
    card: null,
    round: session.round + 1,
    [`scores.${uid}`]: (session.scores[uid] ?? 0) + 1,
  });
}

export async function resetTruthDare(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    level: 'flirty',
    turnUid: '',
    card: null,
    scores: {},
    round: 0,
  });
}
