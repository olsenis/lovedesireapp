import { doc, setDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';

// "Tonight?" signal (Sep 2026, borrowed from In The Mood; COMPETITORS.md).
// A private "I'm in the mood tonight" flag that clears itself at 04:00. The
// partner never sees it unless they have set their own, so saying yes
// never risks a no: either both said it and both see it, or nothing shows.
//
// Privacy lives in firestore.rules, not in the client: tonight/{uid} is
// readable by the partner ONLY while the partner's own signal is live.
// The client therefore subscribes to the partner's doc only once its own
// signal is live (the listener would be denied otherwise) and treats a
// permission error as "not matched".
//
// couples/{coupleId}/tonight/{uid}: { uid, setAt, expiresAt }

// The flag lives until 04:00 local time, whenever it was set, so a tap at
// nine in the morning still means tonight (a fixed 8 h would have run out
// at five). Rules cap expiresAt at now + 24 h, which this never exceeds.
export const TONIGHT_CLEAR_HOUR = 4;

export function tonightExpiry(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(TONIGHT_CLEAR_HOUR, 0, 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export interface TonightSignal {
  uid: string;
  setAt: number;
  expiresAt: number;
}

export function isTonightLive(s: TonightSignal | null | undefined, now: number = Date.now()): boolean {
  return !!s && s.expiresAt > now;
}

export async function setTonight(coupleId: string, uid: string): Promise<void> {
  const now = Date.now();
  await setDoc(doc(db, 'couples', coupleId, 'tonight', uid), {
    uid,
    setAt: now,
    expiresAt: tonightExpiry(now),
  });
  trackEvent('tonight_set');
}

export async function clearTonight(coupleId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'tonight', uid));
}

// Own signal: always readable.
export function subscribeMyTonight(coupleId: string, uid: string, onChange: (s: TonightSignal | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'couples', coupleId, 'tonight', uid),
    (snap) => onChange(snap.exists() ? (snap.data() as TonightSignal) : null),
    () => onChange(null),
  );
}

// Partner's signal: only subscribe while my own signal is live; rules deny
// the read otherwise and the error callback resolves to null.
export function subscribePartnerTonight(coupleId: string, partnerUid: string, onChange: (s: TonightSignal | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'couples', coupleId, 'tonight', partnerUid),
    (snap) => onChange(snap.exists() ? (snap.data() as TonightSignal) : null),
    () => onChange(null),
  );
}

// A match is identified by the later of the two setAt values, so a new
// signal after an expiry is a new match (new push, new banner).
export function tonightMatchKey(mine: TonightSignal, theirs: TonightSignal): string {
  return String(Math.max(mine.setAt, theirs.setAt));
}

export function formatClearTime(expiresAt: number): string {
  return new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
