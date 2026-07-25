import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

export interface HelpState {
  enabled: boolean;
  seen: string[]; // feature keys that have been dismissed
}

const defaultState: HelpState = { enabled: true, seen: [] };

// In-memory cache keyed by uid. useHelp() runs on every screen mount; without
// this cache an 8-screen session = 8 Firestore reads of the same doc.
// Writes update both Firestore and the cache so reads stay coherent within a session.
const cache = new Map<string, HelpState>();

// One-time migration: when Daily Picks + Questions Game merged into one
// screen (July 2026), the new screen uses help key 'daily'. Users who
// already dismissed the old 'daily-wishes' or 'questions' keys should NOT
// see a fresh tutorial for what is effectively the same feature. We
// back-fill on next getHelpState read so the migration is silent — no
// separate flag, no client-side scheduler. Safe to remove after the
// legacy keys stop appearing in production data.
const LEGACY_DAILY_KEYS = ['daily-wishes', 'questions'];
async function backfillDailyKey(uid: string, state: HelpState): Promise<HelpState> {
  if (state.seen.includes('daily')) return state;
  const hasLegacy = LEGACY_DAILY_KEYS.some((k) => state.seen.includes(k));
  if (!hasLegacy) return state;
  const next: HelpState = { ...state, seen: [...state.seen, 'daily'] };
  try {
    await updateDoc(doc(db, 'users', uid, 'private', 'help'), { seen: arrayUnion('daily') });
  } catch {
    // Doc may not exist yet in edge cases; user hasn't seen anything anyway.
  }
  return next;
}

export async function getHelpState(uid: string): Promise<HelpState> {
  const cached = cache.get(uid);
  if (cached) return cached;
  const snap = await getDoc(doc(db, 'users', uid, 'private', 'help'));
  const raw = snap.exists() ? (snap.data() as HelpState) : defaultState;
  const state = await backfillDailyKey(uid, raw);
  cache.set(uid, state);
  return state;
}

export async function markFeatureSeen(uid: string, feature: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'private', 'help');
  try {
    await updateDoc(ref, { seen: arrayUnion(feature) });
  } catch {
    await setDoc(ref, { ...defaultState, seen: [feature] });
  }
  const existing = cache.get(uid) ?? defaultState;
  if (!existing.seen.includes(feature)) {
    cache.set(uid, { ...existing, seen: [...existing.seen, feature] });
  }
}

export async function setHelpEnabled(uid: string, enabled: boolean): Promise<void> {
  const ref = doc(db, 'users', uid, 'private', 'help');
  try {
    await updateDoc(ref, { enabled });
  } catch {
    await setDoc(ref, { ...defaultState, enabled });
  }
  const existing = cache.get(uid) ?? defaultState;
  cache.set(uid, { ...existing, enabled });
}

export async function disableAllHelp(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'help'), { enabled: false, seen: [] });
  cache.set(uid, { enabled: false, seen: [] });
}

export async function resetHelp(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'private', 'help'), defaultState);
  cache.set(uid, defaultState);
}
