import { doc, setDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BINGO_ACTIVITIES } from '../constants/content';

export const MAX_PASSES = 2;
export const MAX_RECEIVER_PASSES = 1;

export interface ActivityCardsSession {
  month: string;
  squares: string[];
  revealed: number[];
  revealedBy: Record<number, string>;
  completed: number[];
  pendingCard: number | null;
  turnUid: string;
  resetCount: number;
  passes: Record<string, number>;
  receiverPasses: Record<string, number>;
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
      const data = snap.data() as any;
      // Migrate old format (checked/checkedBy/winner → revealed/revealedBy/turnUid)
      if (data.revealed === undefined && data.checked !== undefined) {
        const migrated: ActivityCardsSession = {
          month: data.month ?? month,
          squares: data.squares ?? [],
          revealed: data.checked ?? [],
          revealedBy: data.checkedBy ?? {},
          completed: [],
          pendingCard: null,
          turnUid: starterUid,
          resetCount: data.resetCount ?? 0,
          passes: {},
          receiverPasses: {},
        };
        await updateDoc(ref, { revealed: migrated.revealed, revealedBy: migrated.revealedBy, turnUid: migrated.turnUid, passes: {}, receiverPasses: {}, completed: [], pendingCard: null });
        onChange(migrated);
      } else {
        onChange(data as ActivityCardsSession);
      }
    } else {
      // Both partners could hit this branch simultaneously on first-open of
      // the month — each writes a session with their own starterUid, second
      // write clobbers the first. Wrap in a transaction that only writes if
      // the doc is still non-existent inside the tx. If the other partner
      // won the race, we re-read via onSnapshot and use their session.
      const squares = generateCard(month + coupleId + '0');
      const newSession: ActivityCardsSession = {
        month, squares, revealed: [], revealedBy: {},
        turnUid: starterUid, resetCount: 0, passes: {}, receiverPasses: {}, completed: [], pendingCard: null,
      };
      try {
        const winnerSession = await runTransaction(db, async (tx) => {
          const fresh = await tx.get(ref);
          if (fresh.exists()) return fresh.data() as ActivityCardsSession;
          tx.set(ref, newSession);
          return newSession;
        });
        onChange(winnerSession);
      } catch {
        // Transaction retry limit hit — snapshot will fire again with the
        // partner's write, so we just fall through and let the next tick
        // deliver the session.
      }
    }
  }, (error) => {
    console.error('ActivityCards subscription error:', error);
    onChange(null);
  });
}

// Keep old name
export const subscribeBingo = subscribeActivityCards;

export async function usePass(coupleId: string, uid: string, session: ActivityCardsSession): Promise<void> {
  const current = session.passes?.[uid] ?? 0;
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    [`passes.${uid}`]: current + 1,
  });
}

export async function flipCard(
  coupleId: string,
  uid: string,
  index: number,
  nextTurnUid: string
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    revealed: arrayUnion(index),
    [`revealedBy.${index}`]: uid,
    pendingCard: index,
    turnUid: nextTurnUid,
  });
}

export async function markCardDone(
  coupleId: string,
  index: number,
  nextTurnUid: string
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    completed: arrayUnion(index),
    pendingCard: null,
    turnUid: nextTurnUid,
  });
}

// Undo a completed card — used when the recipient mis-tapped "we did it"
export async function uncompleteCard(coupleId: string, index: number): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    completed: arrayRemove(index),
  });
}

export async function skipReceivedCard(
  coupleId: string,
  uid: string,
  session: ActivityCardsSession,
  nextTurnUid: string
): Promise<void> {
  const current = session.receiverPasses?.[uid] ?? 0;
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    pendingCard: null,
    turnUid: nextTurnUid,
    [`receiverPasses.${uid}`]: current + 1,
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
  // setDoc replaces the whole document, so every field on ActivityCardsSession
  // must be set here or downstream readers hit `undefined.has(index)` / similar crashes.
  await setDoc(doc(db, 'couples', coupleId, 'bingo', month), {
    month,
    squares,
    revealed: [],
    revealedBy: {},
    completed: [],
    pendingCard: null,
    turnUid: starterUid,
    resetCount: newReset,
    passes: {},
    receiverPasses: {},
  });
}

