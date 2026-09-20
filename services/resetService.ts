// Reset: erasing one part of a couple's shared history (Sep 19 2026).
//
// The rule, from GDPR Art. 17 and 7(3) read against data that two people
// share (conservative reading, see DPIA.md):
//
//   1. What is YOURS you can always erase, alone and at once.   clearMine
//   2. What is your PARTNER'S needs your partner.               requestReset / confirmReset
//   3. What is inseparably about BOTH (an Intimacy Log entry) either of you
//      can erase: it clears after 7 days, or at once if the partner agrees,
//      and only the person who started it can cancel it.
//
// NEVER make one person's erasure depend on another person, and never let one
// person destroy the other's own data alone.
//
// All deleting is in the `resetCoupleData` callable (functions/src/index.ts):
// the rules forbid a client from deleting Sunday Check-in docs, Moments has
// files in Storage, and "the partner agreed" can only be checked there. The
// keys and kinds below must match RESET_TARGETS in the callable.
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from './firebase';
import { trackEvent } from './statsService';

export type ResetKey =
  | 'fantasyWishes' | 'moods' | 'memoryLane' | 'presence'
  | 'intimacyLog' | 'daily' | 'sunday' | 'moments' | 'notes' | 'ourStory';

//   personal  has a part that is mine and a part that is my partner's
//   derived   no personal content of its own, either of us clears it at once
//   joint     every item is about both of us
export type ResetKind = 'personal' | 'derived' | 'joint';

export interface ResetRow {
  key: ResetKey;
  kind: ResetKind;
  emoji: string;
  label: string;   // the feature's name as the app shows it
  mine: string;    // what "Clear mine" removes (personal rows)
  all: string;     // what clearing for both removes
}

export const RESET_ROWS: ResetRow[] = [
  { key: 'daily',         kind: 'personal', emoji: '🌹', label: 'Daily',
    mine: 'Your answers, votes, hearts, replies and the questions you asked.', all: 'Every answer and vote from both of you.' },
  { key: 'sunday',        kind: 'personal', emoji: '💗', label: 'Sunday Check-in',
    mine: 'Your ratings and answers, in every week.', all: 'Every week, from both of you.' },
  { key: 'moods',         kind: 'personal', emoji: '💫', label: 'Mood History',
    mine: 'Every mood you have set.', all: 'Every mood from both of you.' },
  { key: 'moments',       kind: 'personal', emoji: '📸', label: 'Moments',
    mine: 'Every photo you took.', all: 'Every photo from both of you.' },
  { key: 'notes',         kind: 'personal', emoji: '💌', label: 'Love Notes',
    mine: 'Every note you wrote, with its voice recording.', all: 'Every note from both of you.' },
  { key: 'fantasyWishes', kind: 'personal', emoji: '✨', label: 'Fantasy Wishes',
    mine: 'Your votes, hearts and replies, and every match, because a match shows your Yes.', all: 'Votes and matches from both of you. Wishes you wrote stay.' },
  { key: 'ourStory',      kind: 'personal', emoji: '🗺️', label: 'Our Story',
    mine: 'Milestones you added. The ones the app noticed stay.', all: 'Milestones either of you added. The ones the app noticed stay.' },
  { key: 'intimacyLog',   kind: 'joint',    emoji: '💝', label: 'Intimacy Log',
    mine: '', all: 'Every entry and the stats built on them.' },
  { key: 'memoryLane',    kind: 'derived',  emoji: '📖', label: 'Memory Lane',
    mine: '', all: 'Past rounds and results. New rounds keep coming.' },
  { key: 'presence',      kind: 'derived',  emoji: '🕯️', label: 'Presence',
    mine: '', all: 'Stages and cycles completed. You begin again at Discover.' },
];

export const RESET_REQUEST_TTL_MS = 7 * 24 * 3600_000;

export interface ResetRequest {
  key: ResetKey;
  uid: string;      // who asked
  at: number;
  autoAt?: number;  // joint rows only: when it clears without the partner
  doneAt?: number;      // the partner agreed and it is cleared
  declinedAt?: number;  // the partner said not now, nothing was cleared
  doneBy?: string;
}

// A request that still waits for an answer (or for its date).
export const isOpenReset = (r: ResetRequest): boolean => !r.doneAt && !r.declinedAt;
// The partner's answer, shown to the person who asked until they tap OK.
export const resetAnswerFor = (r: ResetRequest, myUid: string): 'agreed' | 'notNow' | null =>
  r.uid !== myUid ? null : r.doneAt ? 'agreed' : r.declinedAt ? 'notNow' : null;

const functions = getFunctions(app);

async function call(coupleId: string, key: ResetKey, action: 'mine' | 'request' | 'confirm' | 'cancel'): Promise<void> {
  const fn = httpsCallable<{ coupleId: string; key: string; action: string }, { ok: boolean; cleared: boolean }>(functions, 'resetCoupleData');
  await fn({ coupleId, key, action });
}

// My own part (or, for a derived row, the whole thing). Now, alone.
export async function clearMine(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'mine');
  trackEvent('reset_mine');
}
// For both: ask the partner. On a joint row this also starts the 7 day clock.
export async function requestReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'request');
  trackEvent('reset_requested');
}
// The partner agrees, which clears now.
export async function confirmReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'confirm');
  trackEvent('reset_confirmed');
}
// The asker withdrawing (or tapping OK on the partner's answer), or the
// partner's "Not now" on a personal row, which the asker then reads as an
// answer. The callable refuses a partner's cancel on a joint row.
export async function cancelReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'cancel');
}

// Live requests and fresh answers. A joint request stays live until its
// autoAt; an answer is shown for seven days.
export function subscribeResetRequests(coupleId: string, onChange: (reqs: ResetRequest[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'couples', coupleId, 'resetRequests'), (snap) => {
    const now = Date.now();
    onChange(
      snap.docs
        .map((d) => ({ key: d.id as ResetKey, ...(d.data() as Omit<ResetRequest, 'key'>) }))
        .filter((r) => {
          if (!RESET_ROWS.some((row) => row.key === r.key)) return false;
          const answeredAt = r.doneAt ?? r.declinedAt;
          if (answeredAt) return now - answeredAt <= RESET_REQUEST_TTL_MS;
          return r.autoAt ? true : now - (r.at ?? 0) <= RESET_REQUEST_TTL_MS;
        }),
    );
  }, () => onChange([]));
}

export const resetDateLabel = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
