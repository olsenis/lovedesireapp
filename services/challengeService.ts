import { doc, setDoc, updateDoc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { ChallengeProgram } from '../constants/content';
import { trackEvent } from './statsService';

export interface ChallengeState {
  program: ChallengeProgram | null;
  phase: 'setup' | 'active';
  currentDay: number;
  completedDays: number[];
  startedAt: number;
  completedBy: Record<number, string[]>;
  customTasks: Record<number, string>;   // slot -> custom text (overrides default). Keyed by original task slot ID, not display position, so edits follow the slot across reorders.
  editsUsed: Record<string, number>;     // uid -> edits used (free tier max 2 per person, paid unlimited)
  vetoesUsed: Record<string, number>;    // uid -> vetoes used (max 2 per person, both tiers)
  // Paid-only reordering, setup phase only. Length 30, permutation of 1..30.
  // dayOrder[displayIdx-1] = slot ID that displays at day displayIdx.
  // Undefined = default order [1,2,...,30]. Server-side isPremium + phase
  // check in reorderChallenge; free-tier writes rejected in transaction.
  dayOrder?: number[];
}

export const MAX_EDITS = 2;
export const MAX_VETOES = 2;

export function subscribeChallenge(coupleId: string, onChange: (state: ChallengeState | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'challenge', 'active'), (snap) => {
    onChange(snap.exists() ? (snap.data() as ChallengeState) : null);
  });
}

// Start enters setup phase first so partners can edit days
export async function startChallenge(coupleId: string, program: ChallengeProgram): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    program,
    phase: 'setup',
    currentDay: 1,
    completedDays: [],
    startedAt: Date.now(),
    completedBy: {},
    customTasks: {},
    editsUsed: {},
    vetoesUsed: {},
  });
}

// Move from setup to active, anyone can trigger this
export async function activateChallenge(coupleId: string): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), { phase: 'active' });
  trackEvent('challenge_started');
}

// Edit a day's task during setup phase. Uses a transaction so two rapid
// edits (partner and me clicking the same day) don't both see the same
// stale `editsUsed` and cause the counter to under-count.
//
// Paid couples get UNLIMITED edits, so they can fully customise a program
// as their own list (e.g. author every Desire day themselves). Free tier
// still caps at MAX_EDITS per uid. isPremium is read server-side from the
// couple doc rather than trusted from the client, so a spoofed local
// subscription state can't unlock the paid cap.
export async function editTask(
  coupleId: string,
  day: number,
  uid: string,
  text: string,
  _state: ChallengeState
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'challenge', 'active');
  const coupleRef = doc(db, 'couples', coupleId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const coupleSnap = await tx.get(coupleRef);
    const isPremium = coupleSnap.exists() && (coupleSnap.data() as { isPremium?: boolean }).isPremium === true;
    const current = snap.data() as ChallengeState;
    const used = current.editsUsed[uid] ?? 0;
    if (!isPremium && used >= MAX_EDITS) return;
    tx.update(ref, {
      [`customTasks.${day}`]: text,
      [`editsUsed.${uid}`]: used + 1,
    });
  });
}

// Reorder days during setup phase (paid tier only). newOrder must be a
// permutation of 1..30. Server-side reads couple.isPremium + verifies
// phase === 'setup' inside the transaction, so a spoofed client can't
// bypass either gate. Also defensively validates the permutation shape
// (no dupes, in range) to prevent corrupted-write attacks.
export async function reorderChallenge(coupleId: string, newOrder: number[]): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'challenge', 'active');
  const coupleRef = doc(db, 'couples', coupleId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const coupleSnap = await tx.get(coupleRef);
    const isPremium = coupleSnap.exists() && (coupleSnap.data() as { isPremium?: boolean }).isPremium === true;
    if (!isPremium) return;
    const current = snap.data() as ChallengeState;
    if (current.phase !== 'setup') return;
    if (newOrder.length !== 30) return;
    const seen = new Set<number>();
    for (const n of newOrder) {
      if (!Number.isInteger(n) || n < 1 || n > 30 || seen.has(n)) return;
      seen.add(n);
    }
    tx.update(ref, { dayOrder: newOrder });
  });
}

export async function markDayComplete(coupleId: string, uid: string, day: number, _state: ChallengeState): Promise<void> {
  // Transaction prevents lost writes when both partners mark the same day simultaneously.
  // _state arg kept for backwards compatibility with callers but is no longer trusted.
  const ref = doc(db, 'couples', coupleId, 'challenge', 'active');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = snap.data() as ChallengeState;
    const already = current.completedBy[day] ?? [];
    if (already.includes(uid)) return;

    const updatedBy = { ...current.completedBy, [day]: [...already, uid] };
    const bothDone = updatedBy[day].length >= 2;
    const newCompleted = bothDone && !current.completedDays.includes(day)
      ? [...current.completedDays, day]
      : current.completedDays;
    const nextDay = bothDone && current.currentDay === day
      ? Math.min(day + 1, 30)
      : current.currentDay;

    tx.update(ref, {
      completedBy: updatedBy,
      completedDays: newCompleted,
      currentDay: nextDay,
    });
  });
  trackEvent('challenge_day_completed');
}

// Veto skips the current day for both partners automatically.
// Uses a transaction so a partner mid-completion doesn't get their write
// silently overwritten by our stale-state spread, and so double-veto in the
// same tick doesn't debit the vetoesUsed counter twice.
export async function vetoDay(coupleId: string, uid: string, _state: ChallengeState): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'challenge', 'active');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = snap.data() as ChallengeState;
    const used = current.vetoesUsed[uid] ?? 0;
    if (used >= MAX_VETOES) return;

    const day = current.currentDay;
    // Overwriting completedBy[day] is the intended semantic — veto forces the
    // day complete for both regardless of prior progress.
    const updatedBy = { ...current.completedBy, [day]: [uid, `veto:${uid}`] };
    const newCompleted = !current.completedDays.includes(day)
      ? [...current.completedDays, day]
      : current.completedDays;
    const nextDay = Math.min(day + 1, 30);

    tx.update(ref, {
      completedBy: updatedBy,
      completedDays: newCompleted,
      currentDay: nextDay,
      [`customTasks.${day}`]: '🎲 Free day, just have sex however you like.',
      [`vetoesUsed.${uid}`]: used + 1,
    });
  });
}

export async function resetChallenge(coupleId: string): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'challenge', 'active'), {
    program: null,
    phase: 'setup',
    currentDay: 1,
    completedDays: [],
    startedAt: Date.now(),
    completedBy: {},
    customTasks: {},
    editsUsed: {},
    vetoesUsed: {},
  });
}
