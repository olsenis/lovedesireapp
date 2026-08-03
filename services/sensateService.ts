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
  // Number of complete cycles the couple has finished. A cycle = all three
  // stages completed at least once. When the third missing stage gets its
  // first completion within a cycle, this increments and currentCycleStages
  // resets so a new cycle can accumulate.
  cyclesCompleted?: number;
  // Tracks which stages have been completed in the CURRENT (in-progress)
  // cycle. Reset back to all-false when a cycle completes. Absent =
  // treated as all false (fresh cycle or pre-migration doc).
  currentCycleStages?: { stage1: boolean; stage2: boolean; stage3: boolean };
}

const empty = (): SensateProgress => ({
  stage1: { count: 0, lastDate: '' },
  stage2: { count: 0, lastDate: '' },
  stage3: { count: 0, lastDate: '' },
  cyclesCompleted: 0,
  currentCycleStages: { stage1: false, stage2: false, stage3: false },
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
//
// Returns { cycleJustCompleted, cyclesCompleted } so the caller can fire
// the cycle-completion moment on the client. If this completion filled the
// last missing stage in the current cycle, cycleJustCompleted=true and the
// currentCycleStages tracker resets so a fresh cycle can start.
export async function completeStage(
  coupleId: string,
  stageId: 1 | 2 | 3,
  _current: SensateProgress,
): Promise<{ cycleJustCompleted: boolean; cyclesCompleted: number }> {
  const ref = doc(db, 'couples', coupleId, 'sensate', 'progress');
  const stageKey = `stage${stageId}` as 'stage1' | 'stage2' | 'stage3';
  const today = new Date().toISOString().slice(0, 10);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live: SensateProgress = snap.exists() ? (snap.data() as SensateProgress) : empty();
    // Mark stage as completed in the current cycle. Falsy default handles
    // docs written before currentCycleStages was introduced.
    const currentCycle = live.currentCycleStages ?? { stage1: false, stage2: false, stage3: false };
    const nextCycle = { ...currentCycle, [stageKey]: true };
    const allDone = nextCycle.stage1 && nextCycle.stage2 && nextCycle.stage3;
    const cyclesCompleted = (live.cyclesCompleted ?? 0) + (allDone ? 1 : 0);
    // On cycle completion, reset cycle tracker so the couple can go
    // through the arc again. Lifetime stage counts keep growing.
    const finalCycleTracker = allDone
      ? { stage1: false, stage2: false, stage3: false }
      : nextCycle;
    const next: SensateProgress = {
      ...live,
      [stageKey]: {
        count: live[stageKey].count + 1,
        lastDate: today,
      },
      cyclesCompleted,
      currentCycleStages: finalCycleTracker,
    };
    tx.set(ref, next);
    return { cycleJustCompleted: allDone, cyclesCompleted };
  });
}
