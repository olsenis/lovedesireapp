// Reset: start over in one part of the app (Sep 19 2026).
//
// A couple clears ONE kind of shared history without touching the account or
// the pairing. The deleting is done by the `resetCoupleData` callable
// (functions/src/index.ts), never on the client: the rules forbid a client
// from deleting Sunday Check-in docs, Moments has files in Storage, and
// "both agreed" can only be checked on the server.
//
//   small (both: false)  rebuildable or derived. One person, after a confirm.
//   big   (both: true)   something one of you wrote or photographed. One asks,
//                        the other agrees. "Not now" removes the request
//                        quietly; no declined state is ever stored or shown.
//
// The keys must match RESET_TARGETS in the callable.
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from './firebase';
import { trackEvent } from './statsService';

export type ResetKey =
  | 'fantasyWishes' | 'moods' | 'memoryLane' | 'presence'
  | 'intimacyLog' | 'daily' | 'sunday' | 'moments' | 'notes' | 'ourStory';

export interface ResetRow {
  key: ResetKey;
  emoji: string;
  label: string;       // the feature's name as the app shows it
  clears: string;      // what goes, in a sentence
  both: boolean;
}

export const RESET_ROWS: ResetRow[] = [
  { key: 'fantasyWishes', emoji: '✨', label: 'Fantasy Wishes', clears: 'Votes, matches, hearts and replies. Wishes you wrote yourselves stay.', both: false },
  { key: 'moods',         emoji: '💫', label: 'Mood History',   clears: 'Every mood either of you has set.', both: false },
  { key: 'memoryLane',    emoji: '📖', label: 'Memory Lane',    clears: 'Past rounds and results. New rounds keep coming.', both: false },
  { key: 'presence',      emoji: '🕯️', label: 'Presence',       clears: 'Stages and cycles completed. You begin again at Discover.', both: false },
  { key: 'intimacyLog',   emoji: '💝', label: 'Intimacy Log',   clears: 'Every entry and the stats built on them.', both: true },
  { key: 'daily',         emoji: '🌹', label: 'Daily',          clears: 'All answers, votes, hearts and the questions you asked each other.', both: true },
  { key: 'sunday',        emoji: '💗', label: 'Sunday Check-in', clears: 'Every week of ratings and answers.', both: true },
  { key: 'moments',       emoji: '📸', label: 'Moments',        clears: 'Every photo from both of you.', both: true },
  { key: 'notes',         emoji: '💌', label: 'Love Notes',     clears: 'Every note, opened or still waiting, with its voice recordings.', both: true },
  { key: 'ourStory',      emoji: '🗺️', label: 'Our Story',      clears: 'Milestones you added yourselves. The ones the app noticed stay.', both: true },
];

export const RESET_REQUEST_TTL_MS = 7 * 24 * 3600_000;

export interface ResetRequest {
  key: ResetKey;
  uid: string;   // who asked
  at: number;
}

const functions = getFunctions(app);

async function call(coupleId: string, key: ResetKey, action: 'run' | 'request' | 'confirm' | 'cancel'): Promise<{ ok: boolean; cleared: boolean }> {
  const fn = httpsCallable<{ coupleId: string; key: string; action: string }, { ok: boolean; cleared: boolean }>(functions, 'resetCoupleData');
  const res = await fn({ coupleId, key, action });
  return res.data;
}

// Small row: clears now.
export async function runReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'run');
  trackEvent('reset_run');
}
// Big row: ask the partner.
export async function requestReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'request');
  trackEvent('reset_requested');
}
// Big row, partner's side: agree, which clears.
export async function confirmReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'confirm');
  trackEvent('reset_confirmed');
}
// The asker withdrawing, or the partner's "Not now". Same quiet result.
export async function cancelReset(coupleId: string, key: ResetKey): Promise<void> {
  await call(coupleId, key, 'cancel');
}

// Live requests only; a lapsed one is ignored here and refused by the callable.
export function subscribeResetRequests(coupleId: string, onChange: (reqs: ResetRequest[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'couples', coupleId, 'resetRequests'), (snap) => {
    const now = Date.now();
    onChange(
      snap.docs
        .map((d) => ({ key: d.id as ResetKey, ...(d.data() as { uid: string; at: number }) }))
        .filter((r) => now - (r.at ?? 0) <= RESET_REQUEST_TTL_MS && RESET_ROWS.some((row) => row.key === r.key)),
    );
  }, () => onChange([]));
}
