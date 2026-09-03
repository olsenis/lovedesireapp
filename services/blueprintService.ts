import { doc, setDoc, getDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BlueprintType } from '../constants/content';
import { trackEvent } from './statsService';

export interface BlueprintHistoryEntry {
  type: BlueprintType;
  scores: Record<BlueprintType, number>;
  completedAt: number;
}

export interface BlueprintResult {
  type: BlueprintType;
  scores: Record<BlueprintType, number>;
  completedAt: number;
  // Sep 3: retake history so the Lovers screen can render an
  // evolution tag ("Feb 2026 → Feeling · Aug 2026 → Kinky") when
  // the user has taken the quiz more than once. Older entries live
  // here; the top-level type/scores/completedAt always reflects the
  // latest take. Capped at HISTORY_LIMIT to keep the doc bounded.
  history?: BlueprintHistoryEntry[];
}

export interface CoupleBlueprints {
  [uid: string]: BlueprintResult;
}

// Cap on retake history entries per user. 10 covers many years of
// quiz retakes at any realistic cadence and stays well under
// Firestore's 1MB doc size ceiling.
const HISTORY_LIMIT = 10;

// One-shot fetch of a single user's latest blueprint result. Used by
// Home to check the anniversary of the most recent quiz take without
// spinning up a listener. Returns null when the doc doesn't exist or
// the read fails.
export async function getMyBlueprintOneshot(
  coupleId: string | undefined,
  uid: string,
): Promise<BlueprintResult | null> {
  try {
    const ref = coupleId
      ? doc(db, 'couples', coupleId, 'blueprints', uid)
      : doc(db, 'users', uid, 'private', 'blueprint');
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as BlueprintResult) : null;
  } catch {
    return null;
  }
}

// Subscribe to both partners' results in the couple
export function subscribeCoupleBlueprints(
  coupleId: string,
  onChange: (results: CoupleBlueprints) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'couples', coupleId, 'blueprints'), (snap) => {
    const results: CoupleBlueprints = {};
    snap.docs.forEach((d) => { results[d.id] = d.data() as BlueprintResult; });
    onChange(results);
  });
}

export async function saveBlueprintResult(
  uid: string,
  coupleId: string | undefined,
  scores: Record<BlueprintType, number>
): Promise<void> {
  const sorted = (Object.entries(scores) as [BlueprintType, number][]).sort((a, b) => b[1] - a[1]);
  const primaryType = sorted[0][0];
  const newEntry: BlueprintHistoryEntry = { type: primaryType, scores, completedAt: Date.now() };

  const ref = coupleId
    ? doc(db, 'couples', coupleId, 'blueprints', uid)
    : doc(db, 'users', uid, 'private', 'blueprint');

  // Read existing history (if any) and append the new entry. History
  // is bounded at HISTORY_LIMIT to keep the doc small. Skip appending
  // if the very last entry is < 60s old (accidental double-fire from
  // fast taps on the final quiz option).
  let history: BlueprintHistoryEntry[] = [];
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const data = existing.data() as BlueprintResult;
      history = Array.isArray(data.history) ? data.history : [];
      // If never had history before but had a previous result on the
      // doc, seed history with that first-ever result so the evolution
      // tag has a starting point on the second take.
      if (history.length === 0 && data.completedAt && data.type && data.scores) {
        history.push({ type: data.type, scores: data.scores, completedAt: data.completedAt });
      }
    }
  } catch {
    // read-denied or offline — proceed with empty history, this take
    // becomes the first tracked entry
  }
  const last = history[history.length - 1];
  const isDuplicate = last && Date.now() - last.completedAt < 60_000;
  if (!isDuplicate) {
    history.push(newEntry);
    if (history.length > HISTORY_LIMIT) history = history.slice(history.length - HISTORY_LIMIT);
  }

  const data: BlueprintResult = {
    type: primaryType,
    scores,
    completedAt: newEntry.completedAt,
    history,
  };
  await setDoc(ref, data, { merge: true });
  trackEvent('blueprint_completed');
}
