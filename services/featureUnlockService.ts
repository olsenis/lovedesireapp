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
// ON for the Sep 2026 device-test period (user decision Sep 9): Memory Lane
// opens immediately in dev builds so the two-phone tests can run daily.
// Dead in release builds (__DEV__ is false). Before the first store build:
// pick MEMORY_LANE_UNLOCK_DAYS (14 vs 30, undecided) and set this back to
// `__DEV__ && false`. Tracked in TEST_LAUNCH.md "Dev flags".
export const MEMORY_LANE_DEV_UNLOCK = __DEV__ && true;
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
  try {
    await setDoc(doc(db, 'users', uid, 'private', 'features'), { memoryLaneUnlockedAt: ts }, { merge: true });
    // Cache only what actually persisted (Review #11 B8): caching first
    // made a failed write look unlocked for this session and restart the
    // NEW-badge window on the next one.
    cache.set(uid, { ...existing, memoryLaneUnlockedAt: ts });
  } catch {
    // Not cached: the next session retries the write.
  }
  return ts;
}

export function isUnlockRecent(unlockedAt?: number): boolean {
  return !!unlockedAt && Date.now() - unlockedAt < NEW_BADGE_MS;
}

// The 30 days count from the LATER of pairing and the couple's first
// completed ritual, so a couple that pairs and goes quiet does not get a
// NEW badge on a quiz with nothing behind it (Review #11 §2).
export interface MemoryLaneGateInput {
  createdAt?: number;
  firstRitualCompletedAt?: number;
}

export function memoryLaneDaysLeft(couple?: MemoryLaneGateInput | null): number {
  if (MEMORY_LANE_DEV_UNLOCK) return 0;
  const anchor = Math.max(couple?.createdAt ?? 0, couple?.firstRitualCompletedAt ?? 0);
  if (!anchor) return MEMORY_LANE_UNLOCK_DAYS;
  const days = Math.floor((Date.now() - anchor) / 86400000);
  return Math.max(0, MEMORY_LANE_UNLOCK_DAYS - days);
}

export function memoryLaneEligible(couple?: MemoryLaneGateInput | null): boolean {
  return memoryLaneDaysLeft(couple) === 0;
}
