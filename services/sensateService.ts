import { doc, setDoc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export interface StageProgress {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

export interface SensateProgress {
  stage1: StageProgress;
  stage2: StageProgress;
  stage3: StageProgress;
}

const empty = (): SensateProgress => ({
  stage1: { count: 0, lastDate: '' },
  stage2: { count: 0, lastDate: '' },
  stage3: { count: 0, lastDate: '' },
});

export function subscribeSensateProgress(
  coupleId: string,
  onChange: (p: SensateProgress) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'couples', coupleId, 'sensate', 'progress'), (snap) => {
    onChange(snap.exists() ? (snap.data() as SensateProgress) : empty());
  });
}

// Uses a transaction so a concurrent completion of a DIFFERENT stage by the
// partner isn't overwritten by our whole-doc setDoc. Previously the pattern
// was: read local snapshot → spread → write full doc. If partner completed
// stage 2 at the same instant we completed stage 1, our write would clobber
// their stage 2 update because our snapshot didn't yet have it.
export async function completeStage(coupleId: string, stageId: 1 | 2 | 3, _current: SensateProgress): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'sensate', 'progress');
  const key = `stage${stageId}` as keyof SensateProgress;
  const today = new Date().toISOString().slice(0, 10);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live: SensateProgress = snap.exists() ? (snap.data() as SensateProgress) : empty();
    const next: SensateProgress = {
      ...live,
      [key]: {
        count: live[key].count + 1,
        lastDate: today,
      },
    };
    tx.set(ref, next);
  });
}
