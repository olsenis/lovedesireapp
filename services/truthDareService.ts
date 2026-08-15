import { doc, setDoc, updateDoc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DareLevel } from '../constants/content';
import { trackEvent } from './statsService';

export type TDPhase = 'picking' | 'answering' | 'done';

export interface TruthDareCard {
  type: 'truth' | 'dare';
  text: string;
  answer?: string;
  audioURL?: string;        // Firebase Storage URL for voice answer
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

export async function submitTruthAnswer(coupleId: string, uid: string, answer: string, audioURL?: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), {
    'card.answer': answer,
    'card.audioURL': audioURL ?? null,
    'card.answeredBy': uid,
    phase: 'done',
  });
  trackEvent('truth_answered');
}

export async function confirmDare(coupleId: string, uid: string, _session: TruthDareSession): Promise<void> {
  // Single tap from the challenged partner ends the round — picker no
  // longer double-confirms. The click-through was the top friction point
  // in the game per bug bash Aug 2026; trust already lives here so the
  // second confirmation was theater. Idempotent guard covers the double-tap
  // race.
  const ref = doc(db, 'couples', coupleId, 'truthDare', 'active');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = snap.data() as TruthDareSession;
    if ((current.card?.dareConfirmed ?? []).includes(uid)) return;
    tx.update(ref, {
      'card.dareConfirmed': [uid],
      phase: 'done',
    });
  });
  trackEvent('dare_confirmed');
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
