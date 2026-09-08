import { doc, setDoc, updateDoc, deleteDoc, addDoc, getDocs, collection, query, orderBy, arrayUnion, arrayRemove, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BINGO_ACTIVITIES, BingoActivity } from '../constants/content';
import { trackEvent } from './statsService';

export const MAX_PASSES = 2;
export const MAX_RECEIVER_PASSES = 1;
// How many couple-authored cards can join a 25-card deck. Keeps the
// curated pool dominant so a deck never turns into a chore list.
export const MAX_CUSTOM_IN_DECK = 5;

// ─── Couple-authored cards ───────────────────────────────────────────────
// couples/{coupleId}/bingoCustom/{id}. Same shape and rules coverage as
// wyrCustom: the catch-all couple-subcollection rule requires createdBy
// to match the caller on create. Cards join the deck on the next ↺ New
// (resetActivityCards) or on first creation of a month — never injected
// live into an open deck, so the face-down grid stays stable.

export interface CustomCard {
  id: string;
  text: string;
  createdBy: string;
  createdAt: number;
}

export function subscribeCustomCards(coupleId: string, onChange: (cards: CustomCard[]) => void): Unsubscribe {
  const q = query(collection(db, 'couples', coupleId, 'bingoCustom'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomCard)));
  });
}

export async function addCustomCard(coupleId: string, uid: string, text: string): Promise<string> {
  const ref = await addDoc(collection(db, 'couples', coupleId, 'bingoCustom'), {
    text: text.trim(),
    createdBy: uid,
    createdAt: Date.now(),
  });
  trackEvent('bingo_custom_card_added');
  return ref.id;
}

export async function deleteCustomCard(coupleId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'bingoCustom', id));
}

// Newest first, capped at MAX_CUSTOM_IN_DECK. One-shot read used by
// deck generation; the screen keeps its own live subscription.
async function getCustomCardTexts(coupleId: string): Promise<string[]> {
  try {
    const q = query(collection(db, 'couples', coupleId, 'bingoCustom'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => (d.data() as CustomCard).text).filter(Boolean).slice(0, MAX_CUSTOM_IN_DECK);
  } catch {
    return [];
  }
}

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
  // Whether the deck was seeded from quick-only activities (default) or
  // the full pool including planned items (bucket-list mode). Absent on
  // legacy docs = 'quick' (backwards-safe).
  deckMode?: 'quick' | 'all';
}

// Keep old name as alias for backwards compat
export type BingoSession = ActivityCardsSession;

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generateCard(seed: string, mode: 'quick' | 'all' = 'quick', customTexts: string[] = []): string[] {
  let s = 0;
  for (const c of seed) s = ((s << 5) - s + c.charCodeAt(0)) | 0;
  const next = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return Math.abs(s); };
  const shuffle = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = next() % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  // Couple-authored cards are always in (capped), never shuffled out.
  const custom = customTexts.slice(0, MAX_CUSTOM_IN_DECK);
  const customSet = new Set(custom);
  const filtered: BingoActivity[] = mode === 'quick'
    ? BINGO_ACTIVITIES.filter((a) => a.duration === 'quick')
    : [...BINGO_ACTIVITIES];
  const pool = shuffle(filtered.map((a) => a.text).filter((t) => !customSet.has(t)));
  // Second shuffle over the combined 25 so custom cards land anywhere in
  // the face-down grid, not predictably in the top row.
  return shuffle([...custom, ...pool.slice(0, 25 - custom.length)]);
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
      const customTexts = await getCustomCardTexts(coupleId);
      const squares = generateCard(month + coupleId + '0', 'quick', customTexts);
      const newSession: ActivityCardsSession = {
        month, squares, revealed: [], revealedBy: {},
        turnUid: starterUid, resetCount: 0, passes: {}, receiverPasses: {}, completed: [], pendingCard: null,
        deckMode: 'quick',
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

// Transaction so rapid double-tap on Pass doesn't debit the same current
// snapshot twice — both reads would see the same `current` and both writes
// would set current+1, effectively giving the user a free extra pass.
export async function usePass(coupleId: string, uid: string, _session: ActivityCardsSession): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'bingo', monthKey());
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const live = snap.data() as ActivityCardsSession;
    const current = live.passes?.[uid] ?? 0;
    if (current >= MAX_PASSES) return;
    tx.update(ref, { [`passes.${uid}`]: current + 1 });
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
  trackEvent('bingo_card_flipped');
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
    // Accepting resets the consecutive-skip counter for the receiver.
    // Otherwise a couple who skipped 2 then accepted then skipped again
    // would be one skip away from the forced-turn-flip safeguard for
    // reasons no one remembers.
    [`receiverPasses.${nextTurnUid}`]: 0,
  });
  trackEvent('bingo_card_completed');
}

// Undo a completed card — used when the recipient mis-tapped "we did it"
export async function uncompleteCard(coupleId: string, index: number): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'bingo', monthKey()), {
    completed: arrayRemove(index),
  });
}

// After this many consecutive skips by the receiver, the safeguard fires
// and the receiver becomes the next picker so the game doesn't stall on
// a sender who keeps drawing cards the receiver rejects. Reset to 0 on
// an accept (via markCardDone) or on the flip itself.
export const CONSECUTIVE_SKIP_LIMIT = 3;

// Skip a received card. Aug 2026: turn stays with the SENDER by default
// instead of passing to the receiver, so a rejection reads as "your pick
// wasn't quite right, try another" rather than "your card was rejected
// AND now I take your turn". Safeguard: after CONSECUTIVE_SKIP_LIMIT
// skips in a row by the same receiver, turn flips to the receiver
// anyway so the sender can't cycle indefinitely.
// Returns { turnFlipped } so the caller can pick the right notification
// text (sender-picks-again vs safeguard-fired).
export async function skipReceivedCard(
  coupleId: string,
  receiverUid: string,
  senderUid: string,
): Promise<{ turnFlipped: boolean }> {
  const ref = doc(db, 'couples', coupleId, 'bingo', monthKey());
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return { turnFlipped: false };
    const live = snap.data() as ActivityCardsSession;
    const current = live.receiverPasses?.[receiverUid] ?? 0;
    const next = current + 1;
    const flipTurn = next >= CONSECUTIVE_SKIP_LIMIT;
    tx.update(ref, {
      pendingCard: null,
      turnUid: flipTurn ? receiverUid : senderUid,
      [`receiverPasses.${receiverUid}`]: flipTurn ? 0 : next,
    });
    return { turnFlipped: flipTurn };
  });
}

export async function resetActivityCards(
  coupleId: string,
  session: ActivityCardsSession,
  starterUid: string,
  deckMode: 'quick' | 'all' = 'quick'
): Promise<void> {
  const month = monthKey();
  const newReset = (session.resetCount ?? 0) + 1;
  const customTexts = await getCustomCardTexts(coupleId);
  const squares = generateCard(month + coupleId + String(newReset), deckMode, customTexts);
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
    deckMode,
    passes: {},
    receiverPasses: {},
  });
}

