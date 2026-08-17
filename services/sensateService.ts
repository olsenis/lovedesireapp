import { doc, setDoc, onSnapshot, runTransaction, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { trackEvent } from './statsService';

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
  // Post-session mutual-reveal reflections. Keyed by `${cycleNumber}_${stageId}`,
  // then by uid. Each partner types a one-word or short-phrase reaction after
  // a stage completes; both stay hidden until both have written. Optional
  // per session (Skip is a first-class action) so absence isn't a signal.
  reflections?: Record<string, Record<string, string>>;
  // Count of 5-min mini-stage sessions completed. Deliberately kept separate
  // from stage counts + cyclesCompleted so mini sessions don't game the cycle
  // arc — they're a low-friction on-ramp, not a substitute for the full
  // 15-min Discover session.
  miniSessionsCompleted?: number;
  // Timestamp of last mini or full stage completion. Powers the Home
  // "try a 5-min mini" nudge when 7+ days idle and cyclesCompleted >= 1.
  lastActivityAt?: number;
}

const empty = (): SensateProgress => ({
  stage1: { count: 0, lastDate: '' },
  stage2: { count: 0, lastDate: '' },
  stage3: { count: 0, lastDate: '' },
  cyclesCompleted: 0,
  currentCycleStages: { stage1: false, stage2: false, stage3: false },
  reflections: {},
  miniSessionsCompleted: 0,
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
  const result = await runTransaction(db, async (tx) => {
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
    tx.set(ref, { ...next, lastActivityAt: Date.now() });
    return { cycleJustCompleted: allDone, cyclesCompleted };
  });
  if (result.cycleJustCompleted) trackEvent('sensate_cycle_completed');
  return result;
}

// Post-session mutual-reveal reflection. Each partner submits a one-word or
// short-phrase reaction after completing a stage. Stored per uid keyed by
// `${cycleNumber}_${stageId}` so a couple can revisit the same stage across
// cycles and each pair gets its own reveal moment. Both stay hidden until
// bothReflected returns true.
export async function submitReflection(
  coupleId: string,
  uid: string,
  cycleNumber: number,
  stageId: 1 | 2 | 3,
  text: string,
): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'sensate', 'progress');
  const key = `${cycleNumber}_${stageId}`;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live: SensateProgress = snap.exists() ? (snap.data() as SensateProgress) : empty();
    const reflections = { ...(live.reflections ?? {}) };
    reflections[key] = { ...(reflections[key] ?? {}), [uid]: text };
    tx.set(ref, { ...live, reflections });
  });
  trackEvent('sensate_reflection_submitted');
}

// Helper: read whether both partners have submitted a reflection for a given
// cycle+stage. Returns { both: boolean, entries: {uid: text}[] } so the UI
// can decide when to show the mutual-reveal card.
export function bothReflected(
  progress: SensateProgress | null,
  cycleNumber: number,
  stageId: 1 | 2 | 3,
  partner1: string,
  partner2: string,
): { both: boolean; entries: Record<string, string> } {
  const key = `${cycleNumber}_${stageId}`;
  const entries = progress?.reflections?.[key] ?? {};
  const both = !!entries[partner1] && !!entries[partner2];
  return { both, entries };
}

// 5-min mini-stage completion. Distinct from full-stage `completeStage` so
// mini sessions don't game the cycle arc — they don't advance
// currentCycleStages or cyclesCompleted. They do bump miniSessionsCompleted
// and lastActivityAt (which powers the 7-day mini-nudge on Home).
export async function completeMini(coupleId: string): Promise<void> {
  const ref = doc(db, 'couples', coupleId, 'sensate', 'progress');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const live: SensateProgress = snap.exists() ? (snap.data() as SensateProgress) : empty();
    tx.set(ref, {
      ...live,
      miniSessionsCompleted: (live.miniSessionsCompleted ?? 0) + 1,
      lastActivityAt: Date.now(),
    });
  });
  trackEvent('sensate_mini_completed');
}
