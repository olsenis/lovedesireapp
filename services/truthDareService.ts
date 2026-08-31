import { doc, setDoc, updateDoc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { DareLevel } from '../constants/content';
import { trackEvent } from './statsService';

export type TDPhase = 'picking' | 'answering' | 'done';

export interface TruthDareCard {
  type: 'truth' | 'dare';
  text: string;
  // Level the card was sent at. Locked in at playCard time so the
  // badge on the pending card doesn't shift when the picker switches
  // level tabs mid-round (Aug 31 display fix — earlier setTruthDareLevel
  // change let the picker browse other levels while a card was in
  // flight, but the badge on the answering partner's screen followed
  // the current tab instead of the card's real level).
  // Optional so legacy in-flight cards from before the fix still render
  // (they fall back to session.level, matching old behavior).
  level?: DareLevel;
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

// Swap the level pool without touching scores, round, phase, or any
// pending card. Used by the level-tab onPress so tapping a different
// level in the middle of a round does NOT nuke a card the picker has
// already sent to the challenged partner (regression fix Aug 27).
export async function setTruthDareLevel(coupleId: string, level: DareLevel): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'truthDare', 'active'), { level });
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
  // second confirmation was theater.
  //
  // Guard on `phase === 'done'` not on `dareConfirmed.includes(uid)`.
  // Reason: pre-H14 sessions could leave `dareConfirmed` populated
  // (challenged had tapped) while phase stayed 'answering' (picker
  // never double-confirmed). Under a uid-in-list guard, the new tap
  // hits the early return and the session stays stuck. Under a
  // phase-based guard, any tap while phase is still 'answering'
  // advances to 'done' regardless of dareConfirmed state, unblocking
  // stale docs.
  const ref = doc(db, 'couples', coupleId, 'truthDare', 'active');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = snap.data() as TruthDareSession;
    if (current.phase === 'done') return;
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
