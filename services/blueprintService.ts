import { doc, setDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BlueprintType } from '../constants/content';

export interface BlueprintResult {
  type: BlueprintType;
  scores: Record<BlueprintType, number>;
  completedAt: number;
}

export interface CoupleBlueprints {
  [uid: string]: BlueprintResult;
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
  const data = { type: primaryType, scores, completedAt: Date.now() };

  if (coupleId) {
    await setDoc(doc(db, 'couples', coupleId, 'blueprints', uid), data, { merge: true });
  } else {
    // Fallback if coupleId not yet available
    await setDoc(doc(db, 'users', uid, 'private', 'blueprint'), data, { merge: true });
  }
}
