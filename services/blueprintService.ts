import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { BlueprintType } from '../constants/content';

export interface BlueprintResult {
  type: BlueprintType;
  scores: Record<BlueprintType, number>;
  completedAt: number;
}

export function subscribeBlueprintResult(uid: string, onChange: (result: BlueprintResult | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid, 'private', 'blueprint'), (snap) => {
    onChange(snap.exists() ? (snap.data() as BlueprintResult) : null);
  });
}

export async function saveBlueprintResult(uid: string, scores: Record<BlueprintType, number>): Promise<void> {
  const sorted = (Object.entries(scores) as [BlueprintType, number][]).sort((a, b) => b[1] - a[1]);
  const primaryType = sorted[0][0];
  await setDoc(doc(db, 'users', uid, 'private', 'blueprint'), {
    type: primaryType,
    scores,
    completedAt: Date.now(),
  });
}
