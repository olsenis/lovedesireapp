import { doc, setDoc, updateDoc, arrayUnion, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BINGO_ACTIVITIES } from '../constants/content';

export interface ActivityCardsSession {
  month: string;
  squares: string[];
  revealed: number[];
  revealedBy: Record<number, string>;
  turnUid: string;
  resetCount: number;
}

// Keep old name as alias for backwards compat
export type BingoSession = ActivityCardsSession;

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generateCard(seed: string): string[] {
  let s = 0;
  for (const c of seed) s = ((s << 5) - s + c.charCodeAt(0)) | 0;
  const pool = [...BINGO_ACTIVITIES];
  for (let i = pool.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 25);
}

export function subscribeActivityCards(
  coupleId: string,
  starterUid: string,
  onChange: (s: ActivityCardsSession | null) => void
): Unsubscribe {
  const month = monthKey();
  const ref = doc(db, 'couples', coupleId, 'bingo', month);
  return onSnapshot(ref, async (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as ActivityCardsSession);
    } else {
      const squares = generateCard(month + coupleId + '0');
      const newSession: ActivityCardsSession = {
        month, squares, revealed: [], revealedBy: {},
        turnUid: starterUid, resetCount: 0,
      };
      await setDoc(ref, newSession);
      onChange(newSession);
    }
  });
}

// Keep old name
export const subscribeBingo = subscribeActivityCards;

export async function flipCard(
  coupleId: string,
  uid: string,
  index: number,
  nextTurnUid: string
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    revealed: arrayUnion(index),
    [`revealedBy.${index}`]: uid,
    turnUid: nextTurnUid,
  });
}

export async function resetActivityCards(
  coupleId: string,
  session: ActivityCardsSession,
  starterUid: string
): Promise<void> {
  const month = monthKey();
  const newReset = (session.resetCount ?? 0) + 1;
  const squares = generateCard(month + coupleId + String(newReset));
  await setDoc(doc(db, 'couples', coupleId, 'bingo', month), {
    month, squares, revealed: [], revealedBy: {},
    turnUid: starterUid, resetCount: newReset,
  });
}

// Legacy exports (unused but kept to avoid import errors elsewhere)
export const resetBingo = resetActivityCards;
export const checkBingoSquare = async () => {};
export const uncheckBingoSquare = async () => {};
export const hasBingo = () => false;
