import { doc, setDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DareLevel } from '../constants/content';

export type TDPhase = 'picking' | 'answering' | 'done';

export interface TruthDareCard {
  type: 'truth' | 'dare';
  text: string;
  answer?: string;
  answeredBy?: string;
  dareConfirmed?: string[]; // uids who confirmed dare was done
}

export interface TruthDareSession {
  level: DareLevel;
  turnUid: string;       // uid of person whose turn it is to PICK
  phase: TDPhase;
  card: TruthDareCard | null;
  scores: Record<string, number>;
  round: number;
  skipsUsed: Record<string, number>; // uid → skip count
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
    skipsUsed: {},
  });
}

export async function playCard(coupleId: string, card: TruthDareCard): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    card: { ...card, dareConfirmed: [] },
    phase: 'answering',
  });
}

export async function submitTruthAnswer(coupleId: string, uid: string, answer: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    'card.answer': answer,
    'card.answeredBy': uid,
    phase: 'done',
  });
}

export async function confirmDare(coupleId: string, uid: string, session: TruthDareSession): Promise<void> {
  const current = session.card?.dareConfirmed ?? [];
  if (current.includes(uid)) return;
  const updated = [...current, uid];
  const bothConfirmed = updated.length >= 2;
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    'card.dareConfirmed': updated,
    ...(bothConfirmed ? { phase: 'done' } : {}),
  });
}

// Score goes to the CHALLENGED person (not the picker)
export async function nextTurn(
  coupleId: string,
  session: TruthDareSession,
  uid: string,
  partnerId: string
): Promise<void> {
  const nextUid = session.turnUid === uid ? partnerId : uid;
  // The challenged person is the one who is NOT the current picker
  const challengedUid = session.turnUid === uid ? partnerId : uid;
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    turnUid: nextUid,
    phase: 'picking',
    card: null,
    round: session.round + 1,
    [`scores.${challengedUid}`]: (session.scores[challengedUid] ?? 0) + 1,
  });
}

// Only the challenged person (NOT turnUid) can skip
export async function skipCard(
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
    [`skipsUsed.${uid}`]: (session.skipsUsed?.[uid] ?? 0) + 1,
    // No score change
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
    skipsUsed: {},
  });
}
