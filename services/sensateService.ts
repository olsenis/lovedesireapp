import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
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

export async function completeStage(coupleId: string, stageId: 1 | 2 | 3, current: SensateProgress): Promise<void> {
  const key = `stage${stageId}` as keyof SensateProgress;
  const today = new Date().toISOString().slice(0, 10);
  const updated: SensateProgress = {
    ...current,
    [key]: {
      count: current[key].count + 1,
      lastDate: today,
    },
  };
  await setDoc(doc(db, 'couples', coupleId, 'sensate', 'progress'), updated);
}
