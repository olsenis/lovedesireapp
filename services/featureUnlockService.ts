import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Per-user unlock state for features that are data-gated rather than
// paid-gated. Kept separate from `users/{uid}/private/help` because help
// dismissals are semantically different from feature unlocks — help
// state is reset by the "Reset help" button in Profile, but unlocks
// should be sticky (once you've earned it, it stays).
//
// Firestore path: users/{uid}/private/features
// Schema: { versusUnlockedAt?: number }  (absent = still locked)
//
// Rules: the existing match /private/{doc} rule (firestore.rules:45-47)
// already restricts read+write to the user themselves, so no rules
// change needed.

export interface FeatureUnlockState {
  versusUnlockedAt?: number;
}

// In-memory cache keyed by uid. Discover re-mounts on every tab switch;
// without this cache each tab visit incurs a Firestore read of the same
// tiny doc. Writes update both Firestore and the cache so reads stay
// coherent within a session.
const cache = new Map<string, FeatureUnlockState>();

export async function getFeatureUnlockState(uid: string): Promise<FeatureUnlockState> {
  const cached = cache.get(uid);
  if (cached) return cached;
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'features'));
  const state: FeatureUnlockState = snap.exists() ? (snap.data() as FeatureUnlockState) : {};
  cache.set(uid, state);
  return state;
}

export async function markVersusUnlocked(uid: string): Promise<void> {
  const existing = cache.get(uid) ?? {};
  if (existing.versusUnlockedAt) return; // Idempotent — don't overwrite the original unlock timestamp
  const now = Date.now();
  const ref = doc(db, 'users', uid, 'private', 'features');
  try {
    await updateDoc(ref, { versusUnlockedAt: now });
  } catch {
    // Doc doesn't exist yet — create it. First unlock ever for this user.
    await setDoc(ref, { versusUnlockedAt: now });
  }
  cache.set(uid, { ...existing, versusUnlockedAt: now });
}

// True while the unlock is fresh — used to decorate the newly-appeared
// Versus card with a "NEW" badge for a limited window so the user
// notices the addition rather than the card silently materializing.
export function isVersusUnlockRecent(unlockedAt: number | undefined, windowMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
  if (!unlockedAt) return false;
  return Date.now() - unlockedAt < windowMs;
}
