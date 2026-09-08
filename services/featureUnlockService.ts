import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Sticky per-user unlocks for data-gated (not paywalled) features.
// Rebuilt Sep 2026 for Memory Lane after the Versus version was deleted
// in Aug. Doc: users/{uid}/private/features — covered by the generic
// users/{uid}/private/{doc} rule (owner read/write).
//
// "Sticky" matters: eligibility is computed from couple.createdAt, but
// the unlock timestamp is persisted so the NEW badge window is stable
// and so a later change to the eligibility rule never re-locks a
// feature someone already has.

export interface FeatureUnlockState {
  memoryLaneUnlockedAt?: number;
}

const EMPTY: FeatureUnlockState = {};
const cache = new Map<string, FeatureUnlockState>();

// Memory Lane quizzes the couple on their own history, so it needs some.
// 30 days of pairing is the gate; it turns the month-1 churn cliff into
// a milestone ("5 days until a new game").
export const MEMORY_LANE_UNLOCK_DAYS = 30;
// Flip to true locally to test on a fresh couple. Never ship true.
export const MEMORY_LANE_DEV_UNLOCK = __DEV__ && false;
// How long the Discover card wears the NEW badge after unlocking.
const NEW_BADGE_MS = 7 * 86400000;

export async function getFeatureUnlockState(uid: string): Promise<FeatureUnlockState> {
  const cached = cache.get(uid);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'features'));
    const state = snap.exists() ? (snap.data() as FeatureUnlockState) : EMPTY;
    cache.set(uid, state);
    return state;
  } catch {
    return EMPTY;
  }
}

// Idempotent: keeps the first unlock timestamp if one exists.
export async function markMemoryLaneUnlocked(uid: string): Promise<number> {
  const existing = await getFeatureUnlockState(uid);
  if (existing.memoryLaneUnlockedAt) return existing.memoryLaneUnlockedAt;
  const ts = Date.now();
  const next: FeatureUnlockState = { ...existing, memoryLaneUnlockedAt: ts };
  cache.set(uid, next);
  try {
    await setDoc(doc(db, 'users', uid, 'private', 'features'), { memoryLaneUnlockedAt: ts }, { merge: true });
  } catch {
    // Cache already updated; a failed write just means the NEW badge
    // window restarts next session. Not worth surfacing.
  }
  return ts;
}

export function isUnlockRecent(unlockedAt?: number): boolean {
  return !!unlockedAt && Date.now() - unlockedAt < NEW_BADGE_MS;
}

export function memoryLaneDaysLeft(coupleCreatedAt?: number): number {
  if (MEMORY_LANE_DEV_UNLOCK) return 0;
  if (!coupleCreatedAt) return MEMORY_LANE_UNLOCK_DAYS;
  const days = Math.floor((Date.now() - coupleCreatedAt) / 86400000);
  return Math.max(0, MEMORY_LANE_UNLOCK_DAYS - days);
}

export function memoryLaneEligible(coupleCreatedAt?: number): boolean {
  return memoryLaneDaysLeft(coupleCreatedAt) === 0;
}
